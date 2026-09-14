namespace Application.Common.Interfaces;
public record ProductWorkbookRow(int Sku,int Cantidad,double Precio);
public interface IProductWorkbook
{
    List<ProductWorkbookRow> Read(byte[] file);
    byte[] Template();
}
