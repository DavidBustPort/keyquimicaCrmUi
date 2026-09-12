using Application.Common.Interfaces;
namespace Application.Features.Crm.Reports.GetProspeccion;
public record GetProspeccionQuery(int MesInicio, int AnioInicio, int MesFinal, int AnioFinal, bool IsGte, int? IdRik, string? TipoCliente, int? SucursalId) : IApiRequest<byte[]>;
