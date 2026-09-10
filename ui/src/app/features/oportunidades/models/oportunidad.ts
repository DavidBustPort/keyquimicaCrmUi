export type Etapa = 'Análisis' | 'Promoción' | 'Negociación' | 'Cierre' | 'Cancelada'
export type TipoVenta = 'Instalada' | 'Esporádica'
export interface ProductoCatalogo {
    sku: string
    nombre: string
    categoria: string
    precioLista: number
    precioMinimo: number
}
export interface ProductoProyecto extends ProductoCatalogo {
    cantidad: number
    precioVenta: number
    pendiente: boolean
    motivo?: string
    justificacion?: string
    vigencia?: string
}
export interface Oportunidad {
    id: number
    prospectoId: number
    areaId: string
    solucionId: string
    aplicacionId: string
    tipoVenta: TipoVenta
    vpo: number
    vpt: number
    etapa: Etapa
    fecha: string
    productos: ProductoProyecto[]
    acys: number
    facturacion: number
    motivoCancelacion?: string
}
export interface AltaProyecto {
    prospectoId: number
    areaId: string
    solucionId: string
    tipoVenta: TipoVenta
    aplicaciones: { id: string; vpo: number }[]
}
