using Application.Common.Interfaces;
using Application.Common.Wrappers;

namespace Application.Features.Crm.Oportunidades.Commands;

public record CloseCommand(int IdOportunidad) : IApiRequest<bool>;
internal sealed class CloseHandler(ISianwebDbContext db, ITenantContext tenant, ICurrentUserService user)
    : IApiRequestHandler<CloseCommand,bool>
{
    public async Task<Result<bool>> Handle(CloseCommand q,CancellationToken ct)
    {
        if (tenant.CurrentTenant is null || user.RikId is null || user.UserId is null)
            return Result<bool>.Failure(["Se requiere sucursal y RIK."]);
        var sql=ProjectSql.Transaction(ProjectSql.OwnedOpen + """
            DECLARE @Cliente int,@Territorio int,@Owner int,@Acys int,@Version int,@Detail int,@New bit=0,@Now datetime=GETDATE();
            SELECT @Cliente=Id_Cte,@Territorio=Id_Ter,@Owner=Id_Usu FROM CrmOportunidades
                WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Estatus IN (2,3);
            IF @Cliente IS NULL OR @Territorio IS NULL RAISERROR(N'Etapa, cliente o territorio inválidos.', 16, 1);
            DECLARE @pending TABLE(Value int);
            INSERT @pending EXEC sp_crmv3_preciosPendientesPorAutorizarPorProyecto @id_op=@IdOportunidad;
            IF EXISTS(SELECT 1 FROM @pending WHERE Value>0) RAISERROR(N'Hay precios pendientes de autorización.', 16, 1);
            DECLARE @products TABLE(Sku int,Qty int,Price float);
            INSERT @products
                SELECT op.Id_Prd,CAST(ISNULL(op.COP_Cantidad,0) AS int),ISNULL(op.precioVenta,ISNULL(pp.Prd_Pesos,0))
                FROM CrmOportunidadesProductos op JOIN CatProducto p ON p.Id_Prd=op.Id_Prd
                JOIN ProductoPrecio pp ON pp.Id_Prd=op.Id_Prd AND pp.Prd_Actual=1 AND pp.Id_Pre=2
                WHERE op.Id_Cd=@Cd AND op.Id_Op=@IdOportunidad;
            IF NOT EXISTS(SELECT 1 FROM @products) OR EXISTS(SELECT 1 FROM @products WHERE Qty<=0 OR Price<=0)
                RAISERROR(N'Agrega productos con cantidad y precio válidos antes del cierre.', 16, 1);
            SELECT TOP(1) @Acys=Id_Acs,@Version=Id_AcsVersion FROM CapAcys WITH(UPDLOCK,HOLDLOCK)
                WHERE Id_Cd=@Cd AND Id_Cte=@Cliente AND Id_Ter=@Territorio AND Acs_Estatus<>'B'
                ORDER BY Id_AcsVersion DESC,Id_Acs DESC;
            IF @Acys IS NULL
            BEGIN
                SELECT @Acys=ISNULL(MAX(Id_Acs),0)+1 FROM CapAcys WITH(UPDLOCK,HOLDLOCK);
                SET @Version=1;
                SET @New=1;
            """ + AcysHeaderSql.Insert + """
            END;
            SELECT @Detail=ISNULL(MAX(Id_AcsDet),-1) FROM CapAcysDet WITH(UPDLOCK,HOLDLOCK)
                WHERE Id_Cd=@Cd AND Id_Acs=@Acys AND Id_AcsVersion=@Version;
            DECLARE @sku int,@qty int,@price float;
            DECLARE @result TABLE(Value int);
            DECLARE products CURSOR LOCAL FAST_FORWARD FOR SELECT Sku,Qty,Price FROM @products;
            OPEN products;
            FETCH NEXT FROM products INTO @sku,@qty,@price;
            WHILE @@FETCH_STATUS=0
            BEGIN
                SET @Detail=@Detail+1;
                DELETE @result;
                IF @New=1
                    INSERT @result EXEC spCapAcysDet_Insertar
                        @Id_Emp=1,@Id_Cd=@Cd,@Id_AcsDet=@Detail,@Id_Acs=@Acys,@Id_AcsVersion=@Version,
                        @Id_Prd=@sku,@Acs_Cantidad=@qty,@Acs_Documento='',@Acs_Sabado=0,@Acs_Viernes=0,
                        @Acs_Jueves=0,@Acs_Miercoles=0,@Acs_Martes=0,@Acs_Lunes=0,@Acs_Frecuencia=1,
                        @Acs_Precio=@price,@Acs_FechaInicio=@Now,@Acs_FechaFin=@Now,@Acs_CantTotal=@qty,@Id_TG=0;
                ELSE
                    INSERT @result EXEC SP_CapAcysDet_InsertUpdate_ADD
                        @Id_Emp=1,@Id_Cd=@Cd,@Id_Acs=@Acys,@Id_AcsDet=@Detail,@Id_Reg=-1,
                        @Id_Prd=@sku,@Acs_Cantidad=@qty,@Acs_Frecuencia=1,@Acs_FrecuenciaTipo=0,
                        @Acs_Lunes=0,@Acs_Martes=0,@Acs_Miercoles=0,@Acs_Jueves=0,@Acs_Viernes=0,@Acs_Sabado=0,
                        @Acs_Documento='',@Acs_Precio=@price,@Id_Ter=@Territorio,@Acs_UltSCpt=0,@Acs_UltACpt=0,
                        @Acs_Modalidad='0',@Acs_ConsigFechaInicio=@Now,@Acs_ConsigFechaFin=@Now,
                        @Acs_canTTotal=@qty,@Id_AcsVersion=@Version,@Id_TG=0,@RequiereOC=0;
                IF NOT EXISTS(SELECT 1 FROM @result WHERE Value>0) RAISERROR(N'No se pudo guardar el ACYS.', 16, 1);
                FETCH NEXT FROM products INTO @sku,@qty,@price;
            END;
            CLOSE products;
            DEALLOCATE products;
            UPDATE CrmOportunidades SET Estatus=4,Cierre=@Now,FechaModificacion=@Now WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad;
            """);
        try {
            await db.ExecuteAsync(sql,new { Cd=tenant.CurrentTenant.Id,Rik=user.RikId,UserId=user.UserId,q.IdOportunidad },ct);
            return Result<bool>.Success(true,"Oportunidad cerrada y ACYS actualizado.");
        } catch (System.Data.Common.DbException) { return Result<bool>.Failure(["No se pudo cerrar la oportunidad. Verifica etapa, productos y autorizaciones pendientes."]); }
    }
}
