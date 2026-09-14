using System.Text.Json;
using Application.Common.Enums;
using Application.Common.Extensions;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
using Application.Features.Crm.Oportunidades.Contracts;
using Application.Features.Crm.Oportunidades.Queries;

namespace Application.Features.Crm.Oportunidades.Commands;

public record EditProductsCommand(List<ProyectosRequest> Proyectos) : IApiRequest<EditProductosResponse>;
public class ProjectContext
{
    public int Id_Op { get; set; }
    public int? Id_Cte { get; set; }
    public int? Id_Ter { get; set; }
    public int? Id_Usu { get; set; }
    public int? Id_Seg { get; set; }
    public int? ID_Area { get; set; }
    public int? Id_Sol { get; set; }
    public int? Id_Apl { get; set; }
    public int? Estatus { get; set; }
}
internal static class ProductOperations
{
    internal static async Task<ProjectContext?> Project(ISianwebDbContext db,long cd,int rik,int id,CancellationToken ct) =>
        (await db.QueryAsync<ProjectContext>(ConnectionTarget.Sucursal,
            "SELECT * FROM CrmOportunidades WHERE Id_Emp=1 AND Id_Cd=@Cd AND Id_Op=@Id AND Id_Usu=@Rik AND Estatus IN (1,2,3)",
            new {Cd=cd,Rik=rik,Id=id},ct)).FirstOrDefault();
    internal static Task<SpCapAlertaPreciosValidaPrecio?> Prices(ISianwebDbContext db,long cd,int rik,ProjectContext project,ProductosRequest product,CancellationToken ct) =>
        db.QueryStoredProcedureSingleAsync<SpCapAlertaPreciosValidaPrecio>(ConnectionTarget.WebCentral,
            "spCapAlertaPreciosValidaPrecio",new { Id_Emp=1,Id_Cd=cd,Id_Cte=project.Id_Cte,
                Id_Prd=product.Sku,Precio_Vta=product.PrecioVentaSugerido,Id_Rik=rik,Id_Ter=project.Id_Ter },ct);
    internal static readonly string SaveSql = ProjectSql.Transaction(ProjectSql.OwnedOpen + """
        DECLARE @Client int,@Area int,@Sol int,@Apl int;
        SELECT @Client=Id_Cte,@Area=ID_Area,@Sol=Id_Sol,@Apl=Id_Apl FROM CrmOportunidades WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad;
        DECLARE @sku int,@qty int,@price float,@delete bit;
        DECLARE @result TABLE(Value int);
        DECLARE products CURSOR LOCAL FAST_FORWARD FOR
            SELECT Sku,Cantidad,PrecioVentaSugerido,DeleteProducto FROM OPENJSON(@Products)
            WITH(Sku int,Cantidad int,PrecioVentaSugerido float,DeleteProducto bit);
        OPEN products;
        FETCH NEXT FROM products INTO @sku,@qty,@price,@delete;
        WHILE @@FETCH_STATUS=0
        BEGIN
            DELETE @result;
            INSERT @result EXEC sp_crmv3_insertarProductoPorAplicacion
                @id_cd=@Cd,@id_op=@IdOportunidad,@id_cte=@Client,@id_rik=@Rik,@id_prd=@sku,
                @cantidad=@qty,@id_area=@Area,@id_sol=@Sol,@id_apl=@Apl,@precioVenta=@price,@delete=@delete;
            IF NOT EXISTS(SELECT 1 FROM @result WHERE Value>0) RAISERROR(N'No se pudo guardar el producto.', 16, 1);
            FETCH NEXT FROM products INTO @sku,@qty,@price,@delete;
        END;
        CLOSE products;
        DEALLOCATE products;
        UPDATE CrmOportunidades SET Estatus=2,Presentacion=GETDATE(),FechaModificacion=GETDATE()
            WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad AND Estatus=1
            AND EXISTS(SELECT 1 FROM CrmOportunidadesProductos WHERE Id_Cd=@Cd AND Id_Op=@IdOportunidad);
        """);
    internal static Task<int> Save(ISianwebDbContext db,long cd,int rik,int id,List<ProductosRequest> products,CancellationToken ct) =>
        db.ExecuteAsync(SaveSql,new { Cd=cd,Rik=rik,IdOportunidad=id,Products=JsonSerializer.Serialize(products) },ct);
}
internal sealed class EditProductsHandler(ISianwebDbContext db,ITenantContext tenant,ICurrentUserService user)
    : IApiRequestHandler<EditProductsCommand,EditProductosResponse>
{
    public async Task<Result<EditProductosResponse>> Handle(EditProductsCommand q,CancellationToken ct)
    {
        if (tenant.CurrentTenant is null || user.RikId is not {} rik) return Result<EditProductosResponse>.Failure(["Se requiere sucursal y RIK."]);
        if(q.Proyectos is null || q.Proyectos.Count==0 || q.Proyectos.Any(p=>p.Productos is null || p.Productos.Any(x=>
            x.Sku<=0 || (!x.DeleteProducto && (x.Cantidad<=0 || !double.IsFinite(x.PrecioVentaSugerido) || x.PrecioVentaSugerido<=0)))))
            return Result<EditProductosResponse>.Failure(["Productos inválidos."]);
        var cd=tenant.CurrentTenant.Id;
        var response=new EditProductosResponse();
        double revenue=0,cost=0;
        try
        {
            var validate=await db.QuerySingleAsync<bool>("SELECT CAST(CASE WHEN EXISTS(SELECT 1 FROM SysConfiguracion WHERE Id_Emp=1 AND Id_Cd=@Cd AND Id_Conf=952 AND Conf_Valor='1') THEN 1 ELSE 0 END AS bit)",new {Cd=cd},ct);
            foreach(var p in q.Proyectos)
            {
                var project=await ProductOperations.Project(db,cd,rik,p.IdOportunidad,ct);
                var result=new ProyectosResponse {IdOportunidad=p.IdOportunidad,IdCliente=project?.Id_Cte??0,Estatus=true};
                response.Proyectos.Add(result);
                if(project is null) { result.Estatus=false;result.Mensaje="Proyecto no encontrado o no editable.";continue; }
                var pending=await db.QueryStoredProcedureSingleAsync<int>(ConnectionTarget.Sucursal,
                    "sp_crmv3_preciosPendientesPorAutorizarPorProyecto",new {id_op=p.IdOportunidad},ct);
                if(pending>0) {result.Estatus=false;result.Mensaje="La oportunidad tiene precios pendientes por autorizar.";continue;}
                var accepted=new List<ProductosRequest>();
                foreach(var product in p.Productos)
                {
                    if(!product.DeleteProducto)
                    {
                        var found=(await db.QueryStoredProcedureAsync<ProductSearchRow>(ConnectionTarget.Sucursal,
                            "sp_crmv3_busquedaProductoPorId",new {prd_id=product.Sku,id_seg=project.Id_Seg},ct)).FirstOrDefault();
                        if(found is null) {result.Estatus=false;result.Mensaje=$"Producto {product.Sku} no encontrado.";continue;}
                        if(validate)
                        {
                            var price=await ProductOperations.Prices(db,cd,rik,project,product,ct);
                            if(price is not null) { revenue+=product.Cantidad*product.PrecioVentaSugerido;cost+=product.Cantidad*(price.Precio_AAA??0); }
                            if(price is not null && product.PrecioVentaSugerido<found.PrecioLista && price.Precio_MinimoRik>0)
                            {
                                result.Estatus=false;
                                result.Productos.Add(new ProductosValidationDto {
                                    Id=product.Sku,Descripcion=found.Name,Image=found.Img??"",RequiereValidacion=true,
                                    Cantidad=product.Cantidad,PrecioVentaIngresado=product.PrecioVentaSugerido,
                                    PrecioLista=found.PrecioLista,PrecioObjetivo=found.PrecioObjetivo,
                                    PrecioVentaMinimoRik=price.Precio_MinimoRik??0,UtilidadPrima=Math.Round(price.Utilidad??0,2),
                                    PorcentajeUtilidad=Math.Round((price.Utilidad??0)/product.PrecioVentaSugerido*100,2),
                                    ImporteVenta=Math.Round(product.Cantidad*product.PrecioVentaSugerido,2),
                                    TotalUtilidadPrima=Math.Round((price.Utilidad??0)*product.Cantidad,2),FechaVigencia=DateTime.Now.AddMonths(12)
                                });
                                continue;
                            }
                        }
                    }
                    accepted.Add(product);
                }
                if(accepted.Count>0) await ProductOperations.Save(db,cd,rik,p.IdOportunidad,accepted,ct);
            }
            response.Estatus=response.Proyectos.All(p=>p.Estatus);
            if(!response.Estatus) response.InfCliente=new InfCliente {
                IdCliente=response.Proyectos.First().IdCliente,ventaNetaMon=revenue,
                UtilidadMon=revenue-cost,UtilidadPorc=revenue>0?(revenue-cost)/revenue*100:0
            };
            return Result<EditProductosResponse>.Success(response);
        }
        catch(System.Data.Common.DbException) {return Result<EditProductosResponse>.Failure(["No se pudieron guardar los productos. Recarga para consultar los cambios confirmados."]);}
    }
}
