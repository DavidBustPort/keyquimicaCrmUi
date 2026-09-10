import { Lead } from './lead'
export interface LeadDto {
    id: number
    nombreEmpresa: string
    productoInteres: number | string | null
    fechaAlta: string
    giroEmpresa: string | null
    estatusId: number
    estatus: string
    comentarios: string | null
    ciudad: string | null
    correo: string | null
    telefono: string | null
    nombreContacto: string | null
    rik: number | null
    cdId: number
    cd: string | null
    fuente: string | null
}
export interface LeadsResponse {
    data: LeadDto[]
    totalRows: number
}
export interface LeadsQuery {
    page: number
    itemsPerPage: number
    isManager: boolean
    rikId: number | null
    filter: string
}
export interface LeadCatalog {
    id: number
    name: string
}
export function mapLead(dto: LeadDto): Lead {
    const date = new Date(dto.fechaAlta)
    return {
        id: dto.id,
        empresa: dto.nombreEmpresa,
        contacto: dto.nombreContacto ?? '',
        correo: dto.correo ?? '',
        telefono: dto.telefono ?? '',
        fecha: Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-MX').format(date),
        medio: dto.fuente ?? '',
        segmento: dto.giroEmpresa ?? '',
        producto: String(dto.productoInteres ?? ''),
        comentarios: dto.comentarios ?? '',
        ciudad: dto.ciudad ?? '',
        sucursalId: String(dto.cdId),
        sucursal: dto.cd ?? '',
        representanteId: dto.rik == null ? '' : String(dto.rik),
        estatusId: dto.estatusId,
        estatus: dto.estatus,
        estado: [1, 3].includes(dto.estatusId)
            ? 'Disponible'
            : dto.estatusId === 2
              ? 'Desarrollado'
              : [0, 4].includes(dto.estatusId)
                ? 'Rechazado'
                : dto.estatusId === 6
                  ? 'Eliminado'
                  : dto.estatusId === 5
                    ? 'Pendiente'
                    : 'Desconocido',
    }
}
