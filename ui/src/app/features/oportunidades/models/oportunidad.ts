export const ETAPAS = ['Análisis', 'Promoción', 'Negociación', 'Cierre', 'Cancelada'] as const
export interface Catalogo {
	id: number
	name: string
	potencial: number
	activo: boolean
}
export interface ClienteBusqueda {
	id: number
	prospectoId: number
	name: string
}
export interface ProductoBusqueda {
	id: number
	name: string
	img: string | null
	categoria: string | null
	precioObjetivo: number
	precioLista: number
}
export interface Producto {
	sku: number
	descripcion: string
	unidades: number
	precioObjetivo: number
	precioLista: number
	precioVenta: number
	monto: number
	estatusAutorizacion: boolean
	motivoRechazo?: string | null
}
export interface Proyecto {
	idOportunidad: number
	idCliente: number
	cliente: string
	tipoVenta: number
	vpo: number
	vpt: number
	etapa: number
	idArea: number
	area: string
	idSolucion: number
	solucion: string
	idAplicacion: number
	aplicacion: string
	montoProyecto: number
	productos: Producto[]
}
export interface Embudo {
	idOportunidad: number
	idCliente: number
	idProspecto: number
	cliente: string
	aplicacion: string
	tipoVenta: string
	fuente: string
	vpo: number
	vpt: number
	vpmAntesCierre: number
	etapa: number
	integralidad: string
	acys: number
	facturacion: number
	causaCancelacion?: string
	detalle: { fechaRegistro: string; duracionProyecto: string; productos: { sku: number; descripcion: string; unidades: number; precio: number; estatusAutorizacion: boolean }[] }
}
export interface EmbudoQuery {
	isGte: boolean
	page: number
	itemsPerPage: number
	filterNombreEmpresa?: string
	filterMonth?: number
	filterYear?: number
	filterEtapa?: number
	filterRik?: number | null
}
export interface AltaProyecto {
	idProspecto: number | null
	idCliente: number
	idTerritorio: number
	idArea: number
	idSolucion: number
	tipoVenta: number
	aplicaciones: { idAplicacion: number; vpo: number }[]
}
export interface ProductoRequest {
	sku: number
	cantidad: number
	precioVentaSugerido: number
	deleteProducto: boolean
}
export interface PrecioValidacion {
	id: number
	descripcion: string
	cantidad: number
	precioVentaIngresado: number
	precioLista: number
	precioObjetivo: number
	precioVentaMinimoRik: number
	requiereValidacion: boolean
	fechaVigencia: string
}
export interface EdicionResponse {
	estatus: boolean
	mensaje?: string
	proyectos: { idOportunidad: number; idCliente: number; estatus: boolean; mensaje?: string; productos: PrecioValidacion[] }[]
}
export interface PrecioSolicitud extends ProductoRequest {
	motivo: number
	justificacion: string
	fechaVigencia: string
}
