using Application.Features.Crm.Oportunidades.Commands;
using Application.Features.Crm.Oportunidades.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Web.Api.Filters;
namespace Web.Api.Endpoints.Crm;
public class OportunidadesEndpoints : IEndpoints
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group=app.MapGroup("/crm/oportunidades").RequireAuthorization().AddEndpointFilter<SucursalOnlyFilter>();
        group.MapGet("",async ([AsParameters] ListQuery q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapGet("/embudo",async ([AsParameters] EmbudoQuery q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapGet("/excel",async ([AsParameters] ExcelQuery q,ISender s,CancellationToken ct)=>{
            var r=await s.Send(q,ct);
            return r.Succeeded && r.Data is not null ? Results.File(r.Data,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","oportunidades.xlsx") : Results.BadRequest(r);
        });
        group.MapPost("",async ([FromBody] AddCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPut("",async ([FromBody] EditProductsCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapDelete("",async ([FromBody] CancelCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPut("/actualizar-vpo",async ([FromBody] UpdateVpoCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPut("/actualizar-producto",async ([FromBody] UpdateProductCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapDelete("/eliminar-producto",async ([FromBody] DeleteProductCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPost("/etapa-negociacion",async ([FromBody] NegotiateCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPost("/cerrar-oportunidad",async ([FromBody] CloseCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPost("/solicitar-precios",async ([FromBody] RequestPricesCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapGet("/clientes",async ([AsParameters] ClientSearchQuery q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapGet("/productos",async ([AsParameters] ProductSearchQuery q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapPut("/dimension",async ([FromBody] DimensionCommand q,ISender s,CancellationToken ct)=>Results.Ok(await s.Send(q,ct)));
        group.MapGet("/catalogos/{kind}",async (string kind,int? parentId,int? clienteId,ISender s,CancellationToken ct)=>
            Results.Ok(await s.Send(new CatalogQuery(kind,parentId??0,clienteId??0),ct)));
        group.MapGet("/plantilla-productos", (Application.Common.Interfaces.IProductWorkbook workbook, HttpContext context) =>
        {
            context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
            return Results.File(workbook.Template(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "cargaMasiva.xlsx");
        });
        group.MapPost("/importar-productos",async (IFormFile file,[FromForm] int idSeg,ISender sender,CancellationToken ct)=>{
            if(file.Length>5*1024*1024 || !file.FileName.EndsWith(".xlsx",StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(Application.Common.Wrappers.Result<List<ImportedProduct>>.Failure(["Usa un archivo .xlsx de hasta 5 MB."]));
            using var stream=new MemoryStream();
            await file.CopyToAsync(stream,ct);
            return Results.Ok(await sender.Send(new ImportProductsQuery(stream.ToArray(),idSeg),ct));
        }).DisableAntiforgery();
    }
}
