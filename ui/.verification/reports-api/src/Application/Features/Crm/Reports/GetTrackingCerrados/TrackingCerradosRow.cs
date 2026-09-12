namespace Application.Features.Crm.Reports.GetTrackingCerrados
{
    public class TrackingCerradosRow
    {
        public string Efectividad => VPOAlCierre > 0 ? (Facturacion / VPOAlCierre).ToString("P2", System.Globalization.CultureInfo.GetCultureInfo("es-MX")) : "0%";
        public int SucursalId { get; set; }
        public string? Sucursal { get; set; }
        public string Fuente { get; set; } = null!;
        public int IdCte { get; set; }
        public string Cliente { get; set; } = null!;
        public string? Uen { get; set; }
        public string? Segmento { get; set; }
        public int IdProyecto { get; set; }
        public string TipoVenta { get; set; } = null!;
        public DateTime? FechaCierre { get; set; }
        public double VPOAlCierre { get; set; }
        public double Acys { get; set; }
        public double Facturacion { get; set; }
    }
}
