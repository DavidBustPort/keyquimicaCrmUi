namespace Application.Features.Crm.Reports.GetProspeccion
{
    public class ProspeccionResumenDto
    {
        public int TotalProspectos { get; set; }
        public double TotalValor { get; set; }
        public int TotalProspectos_6Meses { get; set; }
        public double TotalValor_6Meses { get; set; }
        public int EmbudoTotal { get; set; }
        public double EmbudoTotalValor { get; set; }
        public int TotalProspectosConOportunidad { get; set; }
        public double TotalProspectosConOportunidadValor { get; set; }
        public int TiempoPromedioDias { get; set; }
    }
}
