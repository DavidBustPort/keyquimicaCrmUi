export interface CatalogOption {
	id: number
	name: string
}
export interface ProspectoRow {
	id: number
	clienteId: number
	empresa: string
	registro: boolean
	vpo: number
	observacionesRik: string
	fuente: string
	mktEstatus: string | null
	gteEstatus: string | null
	rikEstatus: string | null
	totalProyectosAnalisis: number
	totalAnalisis: number
	totalProyectosPromocion: number
	totalPromocion: number
	totalProyectosNegociacion: number
	totalNegociacion: number
	totalProyectosCierre: number
	totalCierre: number
}
export interface ProspectosResponse {
	totalRows: number
	prospectos: ProspectoRow[]
}
export interface ProspectoDetail {
	prospectoId: number | null
	clienteId: number
	razonSocial: string
	contacto: string | null
	correo: string | null
	telefono: string | null
	uenId: number | null
	uen: string | null
	segmentoId: number | null
	segmento: string | null
	segmentoDimension: string | null
	segmentoValorDimension: number | null
	cantidadDimension: number
	tipoClienteId: number
	tipoCliente: string | null
	vpo: number | null
	territorioId: number | null
	territorio: string | null
	observaciones: string | null
	idLead: number | null
	registro: string | null
}
export interface ProspectoPayload {
	razonSocial: string
	contacto: string | null
	correo: string | null
	telefono: string | null
	uenId: number
	segmentoId: number
	tipoClienteId: number
	territorioId: number
	vpo: number
	observaciones: string | null
}
export interface ProspectosQuery {
	page: number
	itemsPerPage: number
	filterMes: number | null
	filterAnio: number | null
	filterNombreProspecto: string | null
	filterRegistro: number | null
	filterFuente: string | null
	filterEtapaLead: string | null
	filterRik: number | null
	filterEtapaOportunidad: number | null
	filterEstatus: number
	isGte: boolean
}
export const STAGES = ['Análisis', 'Promoción', 'Negociación', 'Cierre']
export function stageTotals(row: ProspectoRow) {
	return [
		{ nombre: 'Análisis', proyectos: row.totalProyectosAnalisis, importe: row.totalAnalisis },
		{ nombre: 'Promoción', proyectos: row.totalProyectosPromocion, importe: row.totalPromocion },
		{ nombre: 'Negociación', proyectos: row.totalProyectosNegociacion, importe: row.totalNegociacion },
		{ nombre: 'Cierre', proyectos: row.totalProyectosCierre, importe: row.totalCierre }
	]
}
