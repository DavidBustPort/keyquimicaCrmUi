using Infrastructure.Excel;
using OfficeOpenXml;
using Application.Common.Interfaces;
using Application.Common.Enums;
using Application.Common.Models;
using Application.Common.Wrappers;
using Application.Features.Crm.Oportunidades.Queries;
using System.Reflection;
var workbook=new ProductWorkbook();int checks=0;
void Check(bool ok,string label){if(!ok)throw new Exception(label);checks++;Console.WriteLine("PASS "+label);}
byte[] File(Action<ExcelWorksheet>? edit=null){using var p=new ExcelPackage(new MemoryStream(workbook.Template()));var s=p.Workbook.Worksheets[0];s.Cells[2,1].Value=28;s.Cells[2,2].Value=10;s.Cells[2,3].Value=123.45;edit?.Invoke(s);return p.GetAsByteArray();}
void Invalid(Action<ExcelWorksheet> edit,string label){try{workbook.Read(File(edit));throw new Exception("Accepted "+label);}catch(InvalidDataException){Check(true,label);}}
using(var p=new ExcelPackage(new MemoryStream(workbook.Template()))){var s=p.Workbook.Worksheets[0];Check(s.Cells[1,3].Text=="precio","Template has price");Check(s.Protection.IsProtected&&s.Cells[1,1].Style.Locked&&!s.Cells[2,3].Style.Locked,"Headers protected and values editable");}
var read=workbook.Read(File());Check(read.Count==1&&read[0].Precio==123.45&&read[0].Cantidad==10,"Reads numeric price and quantity");
Invalid(s=>s.Cells[1,1].Value="SKU","Changed header rejected");Check(workbook.Read(File(s=>s.Cells[2,3].Value=null))[0].Precio==0,"Blank price requests default");Check(workbook.Read(File(s=>s.Cells[2,3].Value=0))[0].Precio==0,"Zero price requests default");Invalid(s=>s.Cells[2,3].Value=-1,"Negative price rejected");Invalid(s=>s.Cells[2,3].Formula="1+2","Formula rejected");Invalid(s=>s.Cells[2,2].Value=1.5,"Fractional quantity rejected");Invalid(s=>s.Cells[1,4].Value="extra","Extra column rejected");
var db=DispatchProxy.Create<ISianwebDbContext,DbStub>();var type=typeof(ImportProductsQuery).Assembly.GetType("Application.Features.Crm.Oportunidades.Queries.ImportProductsHandler")!;var handler=Activator.CreateInstance(type,db,new TenantStub(),workbook)!;
var file=File(s=>{s.Cells[3,1].Value=999;s.Cells[3,2].Value=1;s.Cells[3,3].Value=5;});
var result=await (Task<Result<ImportProductsResult>>)type.GetMethod("Handle")!.Invoke(handler,[new ImportProductsQuery(file,1),CancellationToken.None])!;
Check(result.Succeeded&&result.Data!.Products.Count==1,"Valid products returned despite missing SKU");Check(result.Data!.NotFoundSkus.SequenceEqual(new[]{999}),"Missing SKU reported");Check(result.Data.Products[0].PrecioVenta==123.45&&result.Data.Products[0].Monto==1234.5,"Excel overrides database price and total");
foreach(var value in new object?[]{null,0}) {
var fallback=await (Task<Result<ImportProductsResult>>)type.GetMethod("Handle")!.Invoke(handler,[new ImportProductsQuery(File(s=>s.Cells[2,3].Value=value),1),CancellationToken.None])!;
Check(fallback.Data!.Products[0].PrecioVenta==999&&fallback.Data.Products[0].Monto==9990,"Database price and total used for blank/zero");
}
Console.WriteLine($"{checks} checks passed");
public class DbStub:DispatchProxy {protected override object? Invoke(MethodInfo? m,object?[]? a)=>Task.FromResult<IEnumerable<ImportedProduct>>(new[]{new ImportedProduct{Sku=28,Descripcion="Producto",PrecioLista=999,PrecioVenta=999}});}
public class TenantStub:ITenantContext{public Tenant? CurrentTenant{get;set;}=new(){Id=110,Name="Sucursal"};public TenantMode Mode{get;set;}=TenantMode.Sucursal;}
