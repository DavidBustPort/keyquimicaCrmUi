export interface ProspectoFormValue {
	razonSocial: string
	contacto: string
	correo: string
	telefono: string
	uenId: string
	segmentoId: string
	tipoClienteId: string
	territorioId: string
	vpo: number
	cantidadDimension?: number
	estatus?: 'Abierto' | 'Cerrado'
	observaciones: string
}
export interface Prospecto extends ProspectoFormValue {
	representanteId?: string
	id: number
	fuente: 'TD' | 'LD'
	fecha: string
	estatus: 'Abierto' | 'Cerrado'
	registro: boolean
	etapaLead: string
	gteEstatus: string
	rikEstatus: string
	etapas: { nombre: string; proyectos: number; importe: number }[]
	leadId?: number
}
