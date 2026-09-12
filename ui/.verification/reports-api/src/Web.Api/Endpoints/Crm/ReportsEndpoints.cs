using Application.Features.Crm.Reports.GetTrackingCerrados;
using Application.Features.Crm.Reports.GetProspeccion;
using Application.Common.Wrappers;
﻿using Application.Features.Crm.Reports.GetGestionProyectos;
using MediatR;

namespace Web.Api.Endpoints.Crm
{
    public class ReportsEndpoints : IEndpoints
    {
        public void MapEndpoints(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/crm/reports")
                           .RequireAuthorization();

            group.MapGet("/gestion-proyectos", GetGestionProyectos);
            group.MapGet("/tracking-cerrados", async ([AsParameters] GetTrackingCerradosQuery query, ISender sender, CancellationToken ct) => Export(await sender.Send(query, ct), "Tracking_Cerrados"));
            group.MapGet("/prospeccion", async ([AsParameters] GetProspeccionQuery query, ISender sender, CancellationToken ct) => Export(await sender.Send(query, ct), "Prospeccion"));
        }

        private async Task<IResult> GetGestionProyectos(
            [AsParameters] GetGestionProyectosQuery query,
            ISender sender, CancellationToken ct)
        {
            var file = await sender.Send(query, ct);

            return Export(file, "Gestion_Proyectos");
        }
        private static IResult Export(Result<byte[]> result, string name)
        {
            if (!result.Succeeded || result.Data is null || result.Data.Length == 0)
                return Results.BadRequest(Result<byte[]>.Failure(result.Errors.Count > 0 ? result.Errors : ["No se encontraron datos para el reporte."], result.Message));
            return Results.File(result.Data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Reporte_{name}_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx");
        }

    }
}
