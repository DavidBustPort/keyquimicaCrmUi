using Application.Common.Enums;
using Application.Common.Extensions;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
using Application.Features.Crm.Oportunidades.Contracts;
namespace Application.Features.Crm.Oportunidades.Queries;
public record ImportProductsQuery(byte[] File,int IdSeg) : IApiRequest<ImportProductsResult>;
public record ImportProductsResult(List<ImportedProduct> Products, List<int> NotFoundSkus);
public class ImportedProduct : ProductosDto { public string Estatus { get; set; }=""; }
internal sealed class ImportProductsHandler(ISianwebDbContext db,ITenantContext tenant,IProductWorkbook workbook)
    : IApiRequestHandler<ImportProductsQuery,ImportProductsResult>
{
    public async Task<Result<ImportProductsResult>> Handle(ImportProductsQuery q,CancellationToken ct)
    {
        if(tenant.CurrentTenant is null||q.IdSeg<=0)return Result<ImportProductsResult>.Failure(["Se requiere sucursal y segmento."]);
        try
        {
            var input=workbook.Read(q.File);
            var rows=(await db.QueryStoredProcedureAsync<ImportedProduct>(ConnectionTarget.Sucursal,
                "sp_crmv3_validarProductosExcel",new {prdIds=string.Join(",",input.Select(p=>p.Sku)),id_seg=q.IdSeg},ct)).ToList();
            var valid = new List<ImportedProduct>();
            var missing = new List<int>();
            foreach (var item in input)
            {
                var row = rows.FirstOrDefault(r => r.Sku == item.Sku && !string.IsNullOrWhiteSpace(r.Descripcion));
                if (row is null) { missing.Add(item.Sku); continue; }
                row.Unidades = item.Cantidad;
                row.PrecioVenta = item.Precio;
                row.Monto = item.Cantidad * item.Precio;
                valid.Add(row);
            }
            return Result<ImportProductsResult>.Success(new(valid, missing));
        }
        catch(InvalidDataException e){return Result<ImportProductsResult>.Failure([e.Message]);}
        catch(Exception e) when(e is System.Data.Common.DbException or ArgumentException or System.IO.IOException)
        {return Result<ImportProductsResult>.Failure(["No se pudo validar el archivo Excel."]);}
    }
}
