using System.Reflection;
using Application.Common.Interfaces;
using Application.Common.Wrappers;
using Application.Features.Auth;
var db=DispatchProxy.Create<ISianwebDbContext,DbStub>();var stub=(DbStub)(object)db;var tokens=new Tokens();int count=0;
void Check(bool ok,string label){if(!ok)throw new Exception(label);count++;Console.WriteLine("PASS "+label);}
async Task<Result<AuthResponse>> Refresh(string token){var t=typeof(AuthResponse).Assembly.GetType("Application.Features.Auth.RefreshTokenHandler")!;var h=Activator.CreateInstance(t,db,tokens)!;return await (Task<Result<AuthResponse>>)t.GetMethod("Handle")!.Invoke(h,[new RefreshTokenCommand(token),CancellationToken.None])!;}
Check(!(await Refresh("")).Succeeded&&stub.Calls==0,"Empty refresh rejected before SQL");
Check(!(await Refresh(new string('x',257))).Succeeded&&stub.Calls==0,"Oversized refresh rejected");
stub.Valid=false;Check(!(await Refresh("test-refresh")).Succeeded,"Expired or revoked token rejected");
stub.Valid=true;foreach(var branch in new int?[]{null,110}){stub.Branch=branch;var r=await Refresh("test-refresh");Check(r.Succeeded,"Refresh accepted");Check(tokens.Branch==branch&&tokens.User==41,"Token scope comes from stored owner");Check(r.Data!.RefreshToken.Length>=80,"Random replacement generated");Check(stub.Connection=="sianwebcentralConnection","Central persistence");Check(stub.Parameters["Hash"]!.ToString()!.StartsWith("sha256:")&&stub.Parameters["Replacement"]!.ToString()!=r.Data.RefreshToken,"Only hashes sent to SQL");Check(stub.Sql.Contains("UPDLOCK, HOLDLOCK")&&stub.Sql.Contains("ROLLBACK")&&!stub.Sql.Contains("THROW"),"Atomic rotation with legacy SQL error handling");}
Console.WriteLine($"{count} checks passed");
public class Tokens:ITokenService{public int? Branch;public long User;public string CreateToken(long userId,int? sucursalId,TimeSpan? lifetime=null){User=userId;Branch=sucursalId;return "test-access";}}
public class DbStub:DispatchProxy{
 public bool Valid;public int? Branch;public int Calls;public string Sql="";public string? Connection;public Dictionary<string,object?> Parameters=new();
 protected override object? Invoke(MethodInfo? m,object?[]? a){
 Calls++;Sql=(string)a![0]!;Connection=a[2] as string;Parameters=a[1]!.GetType().GetProperties().ToDictionary(p=>p.Name,p=>p.GetValue(a[1]));
 var type=m!.GetGenericArguments()[0];var list=Array.CreateInstance(type,Valid?1:0);if(Valid){var row=Activator.CreateInstance(type)!;type.GetProperty("UserId")!.SetValue(row,41L);type.GetProperty("SucursalId")!.SetValue(row,Branch);list.SetValue(row,0);}
 return typeof(Task).GetMethod("FromResult")!.MakeGenericMethod(typeof(IEnumerable<>).MakeGenericType(type)).Invoke(null,[list]);
 }
}
