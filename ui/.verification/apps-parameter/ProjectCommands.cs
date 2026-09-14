using System.Xml.Linq;
using Application.Common.Enums;
using Application.Common.Extensions;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
using Application.Features.Crm.Oportunidades.Contracts;

namespace Application.Features.Crm.Oportunidades.Commands;

public class AddCommand : AddRequest, IApiRequest<List<AddOportunidadDto>>;
public record UpdateVpoCommand(int IdOportunidad, decimal Vpo) : IApiRequest<bool>;
public record CancelCommand(int IdOportunidad, int IdCausa) : IApiRequest<bool>;
public record NegotiateCommand(int IdOportunidad) : IApiRequest<bool>;
public record UpdateProductCommand(int IdOportunidad, int IdProducto, int Cantidad) : IApiRequest<bool>;
public record DeleteProductCommand(int IdOportunidad, int IdProducto) : IApiRequest<bool>;

internal static class ProjectSql
{
    internal static string Transaction(string body) => """
        SET XACT_ABORT ON;
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
        """ + body + """
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            DECLARE @ErrorMessage nvarchar(4000) = ERROR_MESSAGE();
            RAISERROR(N'%s', 16, 1, @ErrorMessage);
            RETURN;
        END CATCH;
        """;
    internal const string OwnedOpen = """
        IF NOT EXISTS(SELECT 1 FROM CrmOportunidades WITH (UPDLOCK,HOLDLOCK)
            WHERE Id_Emp=1 AND Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Id_Usu=@Rik AND Estatus IN (1,2,3))
            RAISERROR(N'Proyecto no encontrado o no editable.', 16, 1);
        """;
}
internal sealed class AddHandler(ISianwebDbContext db, ITenantContext tenant, ICurrentUserService user)
    : IApiRequestHandler<AddCommand, List<AddOportunidadDto>>
{
    public async Task<Result<List<AddOportunidadDto>>> Handle(AddCommand q, CancellationToken ct)
    {
        if (tenant.CurrentTenant is null || user.RikId is null) return Result<List<AddOportunidadDto>>.Failure(["Se requiere sucursal y RIK."]);
        if (q.IdCliente <= 0 || q.IdTerritorio <= 0 || q.IdArea <= 0 || q.IdSolucion <= 0
            || q.TipoVenta is < 1 or > 2 || q.Aplicaciones.Length == 0
            || q.Aplicaciones.Any(a => a.IdAplicacion <= 0 || !double.IsFinite(a.VPO) || a.VPO <= 0)
            || q.Aplicaciones.Select(a => a.IdAplicacion).Distinct().Count() != q.Aplicaciones.Length)
            return Result<List<AddOportunidadDto>>.Failure(["Completa los datos y las aplicaciones del proyecto."]);
        var sql = ProjectSql.Transaction("""
            IF NOT EXISTS(SELECT 1 FROM CatCliente WHERE Id_Cd=@Cd AND Id_Cte=@IdCliente AND Id_Rik=@Rik AND Cte_CantidadDimension>0)
                RAISERROR(N'Cliente o dimensión inválidos.', 16, 1);
            DECLARE @apps TABLE(IdAplicacion int, VPO float);
            DECLARE @AppsXml xml = CAST(@ApplicationsPayload AS xml);
            INSERT @apps
                SELECT item.value('(@IdAplicacion)[1]', 'int'), item.value('(@VPO)[1]', 'float')
                FROM @AppsXml.nodes('/items/item') AS entries(item);
            IF EXISTS(SELECT 1 FROM @apps a WHERE NOT EXISTS (
                SELECT 1 FROM CatAplicacion ca JOIN CatSolucion s ON s.Id_Sol=ca.Id_Sol
                WHERE ca.Id_Apl=a.IdAplicacion AND ca.Id_Sol=@IdSolucion AND s.Id_Area=@IdArea AND ca.Apl_Activo=1))
                RAISERROR(N'Aplicación inválida.', 16, 1);
            IF EXISTS(SELECT 1 FROM CrmOportunidades o WITH(UPDLOCK,HOLDLOCK)
                JOIN CrmOportunidadesAplicacion a ON a.Id_Op=o.Id_Op AND a.Id_Cd=o.Id_Cd AND a.Id_Emp=o.Id_Emp
                JOIN @apps r ON r.IdAplicacion=a.Id_Apl
                WHERE o.Id_Cd=@Cd AND o.Id_Cte=@IdCliente AND o.Cierre IS NULL AND o.FechaCancelacion IS NULL)
                RAISERROR(N'Ya existe un proyecto activo para la aplicación.', 16, 1);
            DECLARE @app int, @vpo float, @op int;
            DECLARE @ids TABLE(Id int);
            DECLARE @result TABLE(IdOportunidad int,IdAplicacion int);
            DECLARE apps CURSOR LOCAL FAST_FORWARD FOR SELECT IdAplicacion,VPO FROM @apps;
            OPEN apps;
            FETCH NEXT FROM apps INTO @app,@vpo;
            WHILE @@FETCH_STATUS=0
            BEGIN
                DELETE FROM @ids;
                INSERT @ids EXEC sp_crmv3_insertarOportunidad @id_cd=@Cd,@id_apl=@app,
                    @id_cte=@IdCliente,@id_ter=@IdTerritorio,@id_rik=@Rik,@apl_vpo=@vpo,
                    @id_prospecto=@IdProspecto,@tipoVenta=@TipoVenta,@origenCRM=1;
                SELECT @op=Id FROM @ids;
                IF ISNULL(@op,0)<=0 RAISERROR(N'No se pudo crear el proyecto.', 16, 1);
                INSERT CrmOportunidadesAplicacion(Id_Op,Id_Apl,Id_Cd,Id_Emp,CrmOpAp_VPO)
                    VALUES(@op,@app,@Cd,1,@vpo);
                INSERT @result VALUES(@op,@app);
                FETCH NEXT FROM apps INTO @app,@vpo;
            END;
            CLOSE apps;
            DEALLOCATE apps;
            """) + "SELECT * FROM @result;";
        try { return Result<List<AddOportunidadDto>>.Success((await db.QueryAsync<AddOportunidadDto>(
            ConnectionTarget.Sucursal, sql, new { Cd=tenant.CurrentTenant.Id, Rik=user.RikId,
                q.IdCliente,q.IdTerritorio,q.IdProspecto,q.IdArea,q.IdSolucion,q.TipoVenta,
                ApplicationsPayload=new XElement("items", q.Aplicaciones.Select(a => new XElement("item",
                    new XAttribute("IdAplicacion", a.IdAplicacion), new XAttribute("VPO", a.VPO)))).ToString(SaveOptions.DisableFormatting) }, ct)).ToList()); }
        catch (System.Data.Common.DbException) { return Result<List<AddOportunidadDto>>.Failure(["No se pudo crear el proyecto. Verifica cliente, territorio y aplicaciones."]); }
    }
}
internal sealed class MutationHandler(ISianwebDbContext db, ITenantContext tenant, ICurrentUserService user)
    : IApiRequestHandler<UpdateVpoCommand,bool>, IApiRequestHandler<CancelCommand,bool>,
      IApiRequestHandler<NegotiateCommand,bool>, IApiRequestHandler<UpdateProductCommand,bool>, IApiRequestHandler<DeleteProductCommand,bool>
{
    private async Task<Result<bool>> Run(int id, string body, decimal vpo, int cause, int product, int quantity, CancellationToken ct)
    {
        if (tenant.CurrentTenant is null || user.RikId is null || id <= 0) return Result<bool>.Failure(["Se requiere sucursal y RIK."]);
        try {
            await db.ExecuteAsync(ProjectSql.Transaction(ProjectSql.OwnedOpen + """
                DECLARE @pending TABLE(Value int);
                INSERT @pending EXEC sp_crmv3_preciosPendientesPorAutorizarPorProyecto @id_op=@IdOportunidad;
                IF EXISTS(SELECT 1 FROM @pending WHERE Value>0) RAISERROR(N'Hay precios pendientes de autorización.', 16, 1);
                """ + body),
                new { Cd=tenant.CurrentTenant.Id,Rik=user.RikId,IdOportunidad=id,Vpo=vpo,IdCausa=cause,IdProducto=product,Cantidad=quantity },ct);
            return Result<bool>.Success(true);
        } catch (System.Data.Common.DbException) { return Result<bool>.Failure(["No se pudo actualizar el proyecto. Verifica su etapa y los datos."]); }
    }
    public Task<Result<bool>> Handle(UpdateVpoCommand q,CancellationToken ct) => q.Vpo <= 0
        ? Task.FromResult(Result<bool>.Failure(["VPO inválido."]))
        : Run(q.IdOportunidad,"UPDATE CrmOportunidades SET MontoProyecto=@Vpo WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad;",q.Vpo,0,0,0,ct);
    public Task<Result<bool>> Handle(CancelCommand q,CancellationToken ct) => Run(q.IdOportunidad,"""
        IF NOT EXISTS(SELECT 1 FROM crmCausasCancelacion WHERE Id_Causa=@IdCausa AND Estatus=1)
            RAISERROR(N'Motivo inválido.', 16, 1);
        UPDATE CrmOportunidades SET Estatus=5,Id_Causa=@IdCausa,FechaCancelacion=GETDATE(),FechaModificacion=GETDATE()
            WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad;
        """,0,q.IdCausa,0,0,ct);
    public Task<Result<bool>> Handle(NegotiateCommand q,CancellationToken ct) => Run(q.IdOportunidad,"""
        IF NOT EXISTS(SELECT 1 FROM CrmOportunidades WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Estatus=2)
            RAISERROR(N'El proyecto debe estar en promoción.', 16, 1);
        UPDATE CrmOportunidades SET Estatus=3,Negociacion=GETDATE(),FechaModificacion=GETDATE()
            WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad;
        """,0,0,0,0,ct);
    public Task<Result<bool>> Handle(UpdateProductCommand q,CancellationToken ct) => q.Cantidad <= 0
        ? Task.FromResult(Result<bool>.Failure(["Cantidad inválida."]))
        : Run(q.IdOportunidad,"""
            UPDATE CrmOportunidadesProductos SET COP_Cantidad=@Cantidad
                WHERE Id_Emp=1 AND Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Id_Prd=@IdProducto;
            IF @@ROWCOUNT<>1 RAISERROR(N'Producto no encontrado.', 16, 1);
            """,0,0,q.IdProducto,q.Cantidad,ct);
    public Task<Result<bool>> Handle(DeleteProductCommand q,CancellationToken ct) => Run(q.IdOportunidad,"""
        DELETE FROM CrmOportunidadesProductos WHERE Id_Emp=1 AND Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Id_Prd=@IdProducto;
        IF @@ROWCOUNT<>1 RAISERROR(N'Producto no encontrado.', 16, 1);
        """,0,0,q.IdProducto,0,ct);
}
