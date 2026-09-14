using System.Reflection;
using System.Security.Claims;
using Application.Common.Enums;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Common.Wrappers;
using Application.Features.Crm.Integralidad;
var db=DispatchProxy.Create<ISianwebDbContext,DbStub>();var stub=(DbStub)(object)db;var tenant=new TenantStub();var user=new UserStub();int checks=0;
void Check(bool ok,string label){if(!ok)throw new Exception(label);checks++;Console.WriteLine("PASS "+label);}
async Task<Result<T>> Send<T>(IApiRequest<T> query){
var t=typeof(IntegralidadQuery).Assembly.GetTypes().Single(t=>!t.IsAbstract&&typeof(IApiRequestHandler<,>).MakeGenericType(query.GetType(),typeof(T)).IsAssignableFrom(t));
var handler=Activator.CreateInstance(t,db,tenant,user)!;return await (Task<Result<T>>)t.GetMethod("Handle")!.Invoke(handler,[query,CancellationToken.None])!;
}
stub.Rows[typeof(IntegralidadRow)]=new[]{new IntegralidadRow{Id_Cte=12,Id_Ter=9,Id_Seg=2,Id_Uen=1,Seg_ValUniDim=150}};
var now=DateTime.Now;var q=new IntegralidadQuery(now.Month,now.Year,null,null,null,999,false);
var list=await Send(q);Check(list.Succeeded,"List returns SQL rows");Check(stub.Calls.Count==2,"Detail and matrix queried");Check(stub.Calls.All(c=>c.Connection=="siancentralConnection"),"Uses legacy SIANCentral connection");Check(Equals(stub.Calls[0].Parameters["Id_Usu"],475),"RIK comes from session");Check(Equals(stub.Calls[0].Parameters["Tipo"],5)&&Equals(stub.Calls[1].Parameters["Tipo"],7),"Correct query types");
stub.Calls.Clear();var save=new IntegralidadSaveCommand(12,9,2,1,now.Month,now.Year,3,800);var saved=await Send(save);Check(saved.Succeeded,"Saves current period");Check(stub.Calls[1].Command=="sp_Actualizar_IntegralidadMes_VPT","Uses legacy update SP");Check(Equals(stub.Calls[1].Parameters["VPT"],450d),"VPT calculated from database price");
stub.Calls.Clear();Check(!(await Send(save with {Year=now.Year-1})).Succeeded&&stub.Calls.Count==0,"Historical edit rejected before SQL");Check(!(await Send(save with {Quantity=-1})).Succeeded&&stub.Calls.Count==0,"Negative quantity rejected");Check(!(await Send(save with {TerritoryId=999})).Succeeded&&stub.Calls.Count==1,"Customer territory scope enforced");
stub.Calls.Clear();tenant.Mode=TenantMode.Central;Check(!(await Send(q)).Succeeded&&stub.Calls.Count==0,"Central query rejected");var sender=DispatchProxy.Create<MediatR.ISender,SenderStub>();
foreach(var detailed in new[]{false,true}) {
 var t=typeof(IntegralidadQuery).Assembly.GetType("Application.Features.Crm.Integralidad.IntegralidadExportHandler")!;
 var handler=Activator.CreateInstance(t,sender,new Infrastructure.Excel.ExcelReportBuilder());
 var result=await (Task<Result<byte[]>>)t.GetMethod("Handle")!.Invoke(handler,[new IntegralidadExportQuery(q,detailed),CancellationToken.None])!;
 Check(result.Succeeded&&result.Data!.Length>0,"Excel generated "+detailed);
 using var book=new OfficeOpenXml.ExcelPackage(new MemoryStream(result.Data!));
 Check(book.Workbook.Worksheets.Count==1,"Valid Excel "+detailed);
 var text=string.Join("|",book.Workbook.Worksheets[0].Cells.Select(c=>c.Text));
 Check(text.Contains("Empresa")&&(detailed?text.Contains("Aplicación"):text.Contains("Integralidad")),"Excel contains business fields "+detailed);
}
Console.WriteLine($"{checks} checks passed");
public class DbStub:DispatchProxy{
 public Dictionary<Type,object> Rows=new(); public List<(string Command,Dictionary<string,object?> Parameters,string? Connection)> Calls=new();
 protected override object? Invoke(MethodInfo? m,object?[]? a){
 if(m!.Name!="QueryStoredProcedureAsync")throw new NotSupportedException(m.Name);
 Calls.Add(((string)a![0]!,a[1]!.GetType().GetProperties().ToDictionary(p=>p.Name,p=>p.GetValue(a[1])),a[2] as string));
 var type=m.GetGenericArguments()[0];return typeof(Task).GetMethod("FromResult")!.MakeGenericMethod(typeof(IEnumerable<>).MakeGenericType(type)).Invoke(null,[Rows[type]]);
 }
}
public class TenantStub:ITenantContext{public Tenant? CurrentTenant{get;set;}=new(){Id=110,Name="Sucursal"};public TenantMode Mode{get;set;}=TenantMode.Sucursal;}
public class UserStub:ICurrentUserService{public long? UserId{get;set;}=1;public int? RikId{get;set;}=475;public void InitializeFromClaims(ClaimsPrincipal p){} public Task LoadRikAsync(ISianwebDbContext db,CancellationToken ct=default)=>Task.CompletedTask;}

public class SenderStub:DispatchProxy {
 protected override object? Invoke(MethodInfo? m,object?[]? a)=>Task.FromResult(Result<IntegralidadResult>.Success(new(new(){new IntegralidadRow{Id_Cte=12,Cliente="Empresa",Id_Apl=20,Apl_Descripcion="Jabón",Venta=100,PorcentajeAplicacion=10,VPT=1000}},new())));
}
