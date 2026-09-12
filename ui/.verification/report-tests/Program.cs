using System.Reflection;
using System.Security.Claims;
using Application.Common.Enums;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Common.Wrappers;
using Application.Features.Crm.Reports.GetTrackingCerrados;
using Application.Features.Crm.Reports.GetProspeccion;
using Infrastructure.Excel;
using OfficeOpenXml;

var db=DispatchProxy.Create<ISianwebDbContext,DbStub>();var stub=(DbStub)(object)db;
var tenant=new TenantStub(); var user=new UserStub(); int checks=0;
void Check(bool ok,string label){if(!ok)throw new Exception(label);checks++;Console.WriteLine("PASS "+label);}
async Task<Result<byte[]>> Send(IApiRequest<byte[]> query){
 var type=typeof(GetProspeccionQuery).Assembly.GetTypes().Single(t=>!t.IsAbstract&&typeof(IApiRequestHandler<,>).MakeGenericType(query.GetType(),typeof(byte[])).IsAssignableFrom(t));
 var handler=Activator.CreateInstance(type,db,tenant,user,new ExcelReportBuilder())!;
 return await (Task<Result<byte[]>>)type.GetMethod("Handle")!.Invoke(handler,[query,CancellationToken.None])!;
}
stub.Rows[typeof(TrackingCerradosRow)]=new[]{new TrackingCerradosRow{SucursalId=110,Sucursal="Sucursal",Cliente="Empresa",Fuente="TD",IdCte=12,IdProyecto=81,VPOAlCierre=100,Facturacion=50,Acys=60,TipoVenta="VI"}};
stub.Rows[typeof(TrackingCerradosResumenDto)]=new[]{new TrackingCerradosResumenDto{ProyectosCerrados=1,VPO=100,ProyectosEfectivos=1,VPOEfectivos=50}};
stub.Rows[typeof(ProspeccionRow)]=new[]{new ProspeccionRow{SucursalId=110,Sucursal="Sucursal",Prospecto="Empresa",TipoProspecto="TD",Fuente="Prospección",TiempoDias=5}};
stub.Rows[typeof(ProspeccionResumenDto)]=new[]{new ProspeccionResumenDto{TotalProspectos=1,TiempoPromedioDias=5}};
foreach(var central in new[]{false,true}){
 tenant.Mode=central?TenantMode.Central:TenantMode.Sucursal;
 foreach(var tracking in new[]{true,false}){
  stub.Calls.Clear();
  var result=await Send(tracking?new GetTrackingCerradosQuery(8,2026,null,false,999,"TD",110):new GetProspeccionQuery(1,2026,8,2026,false,999,"TD",110));
  Check(result.Succeeded&&result.Data!.Length>0,"Workbook generated "+central+"/"+tracking);
  Check(stub.Calls.Count==2,"Detail and summary queried");
  Check(stub.Calls[0].Connection==(central?"sianwebcentralConnection":"sianweb[Sucursal]Connection"),"Correct database scope");
  Check(central?stub.Calls[0].Parameters["rik"] is null:Equals(stub.Calls[0].Parameters["rik"],475),"Session RIK enforced");
  if(tracking)Check(stub.Calls[0].Parameters.ContainsKey("mes")&&stub.Calls[1].Parameters.ContainsKey("mesIni"),"Tracking parameter names preserved");
  using var workbook=new ExcelPackage(new MemoryStream(result.Data!));
  Check(workbook.Workbook.Worksheets.Count==1,"Valid Excel worksheet");
  var text=string.Join("|",workbook.Workbook.Worksheets[0].Cells.Select(c=>c.Text));
  Check(text.Contains("Empresa")&&text.Contains("Resumen")&&text.Contains("Detalle"),"Summary and detail exported");
  if(tracking)Check(text.Contains("50.00")||text.Contains("50,00"),"Effectiveness is 50 percent");
 }
}
stub.Calls.Clear();var invalid=await Send(new GetProspeccionQuery(12,2026,1,2026,false,null,null,null));Check(!invalid.Succeeded&&stub.Calls.Count==0,"Invalid period rejected before SQL");
stub.Rows[typeof(TrackingCerradosRow)]=Array.Empty<TrackingCerradosRow>();var empty=await Send(new GetTrackingCerradosQuery(8,2026,null,false,null,null,null));Check(!empty.Succeeded,"Empty report returns failure");
Console.WriteLine($"{checks} checks passed");
public class DbStub:DispatchProxy{
 public Dictionary<Type,object> Rows=new(); public List<(string Command,Dictionary<string,object?> Parameters,string? Connection)> Calls=new();
 protected override object? Invoke(MethodInfo? m,object?[]? a){
 if(m!.Name!="QueryStoredProcedureAsync")throw new NotSupportedException(m.Name);
 Calls.Add(((string)a![0]!,new((Dictionary<string,object?>)a[1]!),a[2] as string));
 var type=m.GetGenericArguments()[0];return typeof(Task).GetMethod("FromResult")!.MakeGenericMethod(typeof(IEnumerable<>).MakeGenericType(type)).Invoke(null,[Rows[type]]);
 }
}
public class TenantStub:ITenantContext{public Tenant? CurrentTenant{get;set;}=new(){Id=110,Name="Sucursal"};public TenantMode Mode{get;set;}=TenantMode.Sucursal;}
public class UserStub:ICurrentUserService{public long? UserId{get;set;}=1;public int? RikId{get;set;}=475;public void InitializeFromClaims(ClaimsPrincipal p){} public Task LoadRikAsync(ISianwebDbContext db,CancellationToken ct=default)=>Task.CompletedTask;}
