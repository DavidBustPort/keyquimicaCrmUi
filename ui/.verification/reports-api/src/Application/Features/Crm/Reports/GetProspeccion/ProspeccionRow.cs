namespace Application.Features.Crm.Reports.GetProspeccion
{
    public class ProspeccionRow
    {
        public int SucursalId { get; set; }
        public string? Sucursal { get; set; }
        public string TipoProspecto { get; set; } = null!;
        public string Fuente { get; set; } = null!;
        public int IdCte { get; set; }
        public string Prospecto { get; set; } = null!;
        public string? Uen { get; set; }
        public string? Segmento { get; set; }
        public int IdProspecto { get; set; }
        public double VPOGlobal { get; set; }
        public DateTime? FechaRegistro { get; set; }
        public DateTime? PeriodoGeneracionProyecto { get; set; }
        public int TiempoDias { get; set; }
    }
}
