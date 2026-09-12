using Application.Common.Enums;
using Application.Common.Extensions;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
namespace Application.Features.Crm.Reports.GetProspeccion;
internal sealed class GetProspeccionHandler(ISianwebDbContext db, ITenantContext tenant, ICurrentUserService user, IExcelReportBuilder excel) : IApiRequestHandler<GetProspeccionQuery, byte[]>
{
 public async Task<Result<byte[]>> Handle(GetProspeccionQuery request, CancellationToken ct)
 {
  if (request.MesInicio is < 1 or > 12 || request.MesFinal is < 1 or > 12 || request.AnioInicio is < 1900 or > 9998 || request.AnioFinal is < 1900 or > 9998 || request.AnioInicio * 12 + request.MesInicio > request.AnioFinal * 12 + request.MesFinal)
   return Result<byte[]>.Failure(["Selecciona un periodo válido."], "Filtros inválidos.");
  if (request.TipoCliente is not null and not "TD" and not "LD") return Result<byte[]>.Failure(["Tipo de cliente inválido."]);
  bool central = tenant.Mode == TenantMode.Central;
  if (!central && tenant.CurrentTenant is null) return Result<byte[]>.Failure(["No se pudo resolver la sucursal."]);
  if (!central && !request.IsGte && user.RikId is null) return Result<byte[]>.Failure(["No se pudo resolver el RIK de la sesión."]);
  int? rik = central ? null : request.IsGte ? request.IdRik : user.RikId;
  var target = central ? ConnectionTarget.WebCentral : ConnectionTarget.Sucursal;
  var parameters = new Dictionary<string, object?> {
   ["mesIni"] = request.MesInicio, ["anioIni"] = request.AnioInicio, ["mesFin"] = request.MesFinal, ["anioFin"] = request.AnioFinal,
   ["rik"] = rik, ["tipoCliente"] = request.TipoCliente
  };
  if (central) parameters["sucursalId"] = request.SucursalId ?? -1;
  string procedure = central ? "sp_crmv3_ProspeccionCentral" : "sp_crmv3_Prospeccion";
  var rows = (await db.QueryStoredProcedureAsync<ProspeccionRow>(target, procedure + "_Reporte", parameters, ct)).ToList();
  if (rows.Count == 0) return Result<byte[]>.Failure(["No se encontraron datos para los filtros seleccionados."], "Reporte vacío.");
  
  var summary = (await db.QueryStoredProcedureAsync<ProspeccionResumenDto>(target, procedure + "_Datos", parameters, ct)).ToList();
  if (summary.Count == 0) return Result<byte[]>.Failure(["No se pudo obtener el resumen del reporte."]);
  var filters = new Dictionary<string, object?> {
   ["Sucursal"] = central ? (request.SucursalId?.ToString() ?? "Todas") : tenant.CurrentTenant!.Name,
   ["RIK"] = rik?.ToString() ?? "Todos",
   ["Periodo"] = $"{request.MesInicio:D2}/{request.AnioInicio} — {request.MesFinal:D2}/{request.AnioFinal}",
   ["Tipo de cliente"] = request.TipoCliente ?? "Todos"
  };
  
  var headers = new Dictionary<string, string> { ["TipoProspecto"] = "Tipo de prospecto",
["Fuente"] = "Fuente",
["IdCte"] = "Cliente #",
["Prospecto"] = "Prospecto",
["Uen"] = "UEN",
["Segmento"] = "Segmento",
["IdProspecto"] = "Prospecto #",
["VPOGlobal"] = "VPO",
["FechaRegistro"] = "Fecha de registro",
["PeriodoGeneracionProyecto"] = "Generación de proyectos",
["TiempoDias"] = "Tiempo transcurrido (días)" };
  if (central) headers = new Dictionary<string,string> { ["SucursalId"] = "Sucursal #", ["Sucursal"] = "Sucursal" }.Concat(headers).ToDictionary(x => x.Key, x => x.Value);
  return Result<byte[]>.Success(excel.CreateSheet("Prospección").AddHeader("Reporte de prospección").AddFilters(filters).AddTable("Resumen", summary, new Dictionary<string,string> { ["TotalProspectos"] = "Total de prospectos",
["TotalValor"] = "VPO total",
["TotalProspectos_6Meses"] = "Prospectos de 6 meses",
["TotalValor_6Meses"] = "VPO de 6 meses",
["EmbudoTotal"] = "Embudo total",
["EmbudoTotalValor"] = "VPO embudo",
["TotalProspectosConOportunidad"] = "Prospectos con oportunidad",
["TotalProspectosConOportunidadValor"] = "VPO con oportunidad",
["TiempoPromedioDias"] = "Tiempo promedio (días)" }).AddEmptyRows().AddTable("Detalle", rows, headers).Build());
 }
}
