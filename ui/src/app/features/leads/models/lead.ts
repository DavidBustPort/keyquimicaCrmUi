export type LeadState = 'Pendiente' | 'Disponible' | 'Desarrollado' | 'Rechazado'
export type LeadView = 'representante' | 'gerente'
export interface Lead {
    id: number
    empresa: string
    contacto: string
    correo: string
    telefono: string
    fecha: string
    medio: string
    segmento: string
    producto: string
    comentarios: string
    ciudad: string
    sucursalId: string
    representanteId: string
    estado: LeadState
    motivo?: string
    rechazadoPor?: 'gerente' | 'representante'
}
export function leadStatus(lead: Lead) {
    if (lead.estado === 'Disponible') return 'Asignado'
    if (lead.estado === 'Pendiente') return 'Por asignar'
    if (lead.estado === 'Rechazado')
        return lead.rechazadoPor === 'gerente' ? 'Cancelado por el gerente' : 'Rechazado'
    return 'Desarrollado'
}
