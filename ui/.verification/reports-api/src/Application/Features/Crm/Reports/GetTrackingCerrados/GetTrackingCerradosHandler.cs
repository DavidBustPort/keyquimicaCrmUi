using Application.Common.Enums;
using Application.Common.Extensions;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
namespace Application.Features.Crm.Reports.GetTrackingCerrados;
internal sealed class GetTrackingCerradosHandler(ISianwebDbContext db, ITenantContext tenant, ICurrentUserService user, IExcelReportBuilder excel) : IApiRequestHandler<GetTrackingCerradosQuery, byte[]>
{
 public async Task<Result<byte[]>> Handle(GetTrackingCerradosQuery request, CancellationToken ct)
 {
  if (request.Mes is < 1 or > 12 || request.Anio is < 1900 or > 9998)
   return Result<byte[]>.Failure(["Selecciona un periodo válido."], "Filtros inválidos.");
  if (request.TipoCliente is not null and not "TD" and not "LD") return Result<byte[]>.Failure(["Tipo de cliente inválido."]);
  bool central = tenant.Mode == TenantMode.Central;
  if (!central && tenant.CurrentTenant is null) return Result<byte[]>.Failure(["No se pudo resolver la sucursal."]);
  if (!central && !request.IsGte && user.RikId is null) return Result<byte[]>.Failure(["No se pudo resolver el RIK de la sesión."]);
  int? rik = central ? null : request.IsGte ? request.IdRik : user.RikId;
  var target = central ? ConnectionTarget.WebCentral : ConnectionTarget.Sucursal;
  var parameters = new Dictionary<string, object?> {
   ["mes"] = request.Mes, ["anio"] = request.Anio, ["categoriaProducto"] = request.Categoria,
   ["rik"] = rik, ["tipoCliente"] = request.TipoCliente
  };
  if (central) parameters["sucursalId"] = request.SucursalId ?? -1;
  string procedure = central ? "sp_crmv3_TrackingCerradosCentral" : "sp_crmv3_TrackingCerrados";
  var rows = (await db.QueryStoredProcedureAsync<TrackingCerradosRow>(target, procedure + "_Reporte", parameters, ct)).ToList();
  if (rows.Count == 0) return Result<byte[]>.Failure(["No se encontraron datos para los filtros seleccionados."], "Reporte vacío.");
  parameters.Remove("mes"); parameters.Remove("anio"); parameters["mesIni"] = request.Mes; parameters["anioIni"] = request.Anio;
  var summary = (await db.QueryStoredProcedureAsync<TrackingCerradosResumenDto>(target, procedure + "_Datos", parameters, ct)).ToList();
  if (summary.Count == 0) return Result<byte[]>.Failure(["No se pudo obtener el resumen del reporte."]);
  var filters = new Dictionary<string, object?> {
   ["Sucursal"] = central ? (request.SucursalId?.ToString() ?? "Todas") : tenant.CurrentTenant!.Name,
   ["RIK"] = rik?.ToString() ?? "Todos",
   ["Periodo"] = $"{request.Mes:D2}/{request.Anio}",
   ["Tipo de cliente"] = request.TipoCliente ?? "Todos"
  };
  filters["Categoría"] = request.Categoria ?? "Todas";
 filters["Periodo ACYS / Facturación"] = $"{new DateTime(request.Anio, request.Mes, 1).AddMonths(1):MM/yyyy} — {new DateTime(request.Anio, request.Mes, 1).AddMonths(3):MM/yyyy}";
 filters["Efectividad promedio"] = rows.Average(r => r.VPOAlCierre > 0 ? r.Facturacion / r.VPOAlCierre : 0).ToString("P2");
  var headers = new Dictionary<string, string> { ["Fuente"] = "Tipo de cliente",
["IdCte"] = "Cliente #",
["Cliente"] = "Cliente",
["Uen"] = "UEN",
["Segmento"] = "Segmento",
["IdProyecto"] = "Proyecto #",
["TipoVenta"] = "Tipo de venta",
["VPOAlCierre"] = "VPO al cierre",
["FechaCierre"] = "Fecha de cierre",
["Acys"] = "ACYS",
["Facturacion"] = "Facturación",
["Efectividad"] = "Efectividad" };
  if (central) headers = new Dictionary<string,string> { ["SucursalId"] = "Sucursal #", ["Sucursal"] = "Sucursal" }.Concat(headers).ToDictionary(x => x.Key, x => x.Value);
  return Result<byte[]>.Success(excel.CreateSheet("Tracking cerrados").AddHeader("Tracking de proyectos cerrados").AddFilters(filters).AddTable("Resumen", summary, new Dictionary<string,string> { ["ProyectosCerrados"] = "Proyectos cerrados",
["VPO"] = "VPO",
["ProyectosEfectivos"] = "Proyectos efectivos",
["VPOEfectivos"] = "VPO efectivo" }).AddEmptyRows().AddTable("Detalle", rows, headers).Build());
 }
}
