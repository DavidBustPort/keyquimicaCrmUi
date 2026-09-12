using Application.Common.Interfaces;
namespace Application.Features.Crm.Reports.GetTrackingCerrados;
public record GetTrackingCerradosQuery(int Mes, int Anio, string? Categoria, bool IsGte, int? IdRik, string? TipoCliente, int? SucursalId) : IApiRequest<byte[]>;
