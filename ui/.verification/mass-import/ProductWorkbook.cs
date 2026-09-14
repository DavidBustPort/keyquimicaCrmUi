using Application.Common.Interfaces;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Globalization;
using System.Drawing;
namespace Infrastructure.Excel;
public sealed class ProductWorkbook : IProductWorkbook
{
    private static readonly string[] Headers = ["productoId", "cantidad", "precio"];
    public ProductWorkbook() { ExcelPackage.License.SetNonCommercialPersonal("key"); }
    public byte[] Template()
    {
        using var package = new ExcelPackage();
        var sheet = package.Workbook.Worksheets.Add("Productos");
        for (var column = 1; column <= 3; column++)
        {
            sheet.Cells[1, column].Value = Headers[column - 1];
            sheet.Column(column).Width = 22;
        }
        var header = sheet.Cells[1, 1, 1, 3];
        header.Style.Font.Bold = true;
        header.Style.Font.Color.SetColor(Color.White);
        header.Style.Fill.PatternType = ExcelFillStyle.Solid;
        header.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(0, 127, 199));
        sheet.Row(1).Height = 24;
        sheet.Cells[2, 1, 5001, 3].Style.Locked = false;
        sheet.Cells[2, 1, 5001, 2].Style.Numberformat.Format = "0";
        sheet.Cells[2, 3, 5001, 3].Style.Numberformat.Format = "0.00";
        sheet.Protection.IsProtected = true;
        sheet.View.FreezePanes(2, 1);
        return package.GetAsByteArray();
    }
    public List<ProductWorkbookRow> Read(byte[] file)
    {
        using var package = new ExcelPackage(new MemoryStream(file));
        var sheet = package.Workbook.Worksheets.FirstOrDefault();
        if (package.Workbook.Worksheets.Count != 1 || sheet?.Dimension is null || sheet.Dimension.Columns != 3)
            throw new InvalidDataException("Usa la plantilla con las columnas productoId, cantidad y precio, sin agregar ni quitar columnas.");
        for (var column = 1; column <= 3; column++)
            if (!string.IsNullOrEmpty(sheet.Cells[1, column].Formula) || !string.Equals(sheet.Cells[1, column].Text.Trim(), Headers[column - 1], StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("No modifiques los encabezados ni su orden: productoId, cantidad, precio.");
        if (sheet.Dimension.Rows > 5001) throw new InvalidDataException("El archivo admite hasta 5000 productos.");
        var result = new List<ProductWorkbookRow>();
        var seen = new HashSet<int>();
        for (var row = 2; row <= sheet.Dimension.Rows; row++)
        {
            if (Enumerable.Range(1, 3).All(c => string.IsNullOrWhiteSpace(sheet.Cells[row, c].Text) && string.IsNullOrEmpty(sheet.Cells[row,c].Formula))) continue;
            if (Enumerable.Range(1, 3).Any(c => !string.IsNullOrEmpty(sheet.Cells[row,c].Formula)))
                throw new InvalidDataException($"Fila {row}: ingresa valores, no fórmulas.");
            var skuValue = Convert.ToString(sheet.Cells[row,1].Value, CultureInfo.InvariantCulture);
            var quantityValue = Convert.ToString(sheet.Cells[row,2].Value, CultureInfo.InvariantCulture);
            var priceValue = Convert.ToString(sheet.Cells[row,3].Value, CultureInfo.InvariantCulture);
            if (!int.TryParse(skuValue, out var sku) || sku <= 0 || !int.TryParse(quantityValue, out var quantity) || quantity <= 0)
                throw new InvalidDataException($"Fila {row}: productoId y cantidad son obligatorios y deben ser enteros mayores a cero.");
            if (!double.TryParse(priceValue, NumberStyles.Float, CultureInfo.InvariantCulture, out var price) || !double.IsFinite(price) || price <= 0 || !double.IsFinite(price * quantity))
                throw new InvalidDataException($"Fila {row}: precio es obligatorio y debe ser un número mayor a cero.");
            if (!seen.Add(sku)) throw new InvalidDataException($"Fila {row}: productoId {sku} está duplicado en el Excel.");
            result.Add(new(sku, quantity, price));
        }
        if (result.Count == 0) throw new InvalidDataException("El archivo no contiene productos.");
        return result;
    }
}
