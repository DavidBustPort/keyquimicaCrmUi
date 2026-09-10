export const ETAPAS = ['Análisis', 'Promoción', 'Negociación', 'Cierre', 'Cancelada'] as const
export const AREAS = [
    { value: '1', label: 'Instalaciones' },
    { value: '2', label: 'Producción' },
    { value: '3', label: 'Cocina' },
]
export const SOLUCIONES = [
    { value: '11', label: 'Higiene de superficies', areaId: '1' },
    { value: '12', label: 'Higiene personal', areaId: '1' },
    { value: '21', label: 'Limpieza industrial', areaId: '2' },
    { value: '31', label: 'Seguridad alimentaria', areaId: '3' },
]
export const APLICACIONES = [
    { value: '111', label: 'Limpieza de pisos', solucionId: '11', potencial: 40 },
    { value: '112', label: 'Desinfección de superficies', solucionId: '11', potencial: 60 },
    { value: '121', label: 'Lavado de manos', solucionId: '12', potencial: 100 },
    { value: '211', label: 'Desengrase de maquinaria', solucionId: '21', potencial: 60 },
    { value: '212', label: 'Limpieza de áreas de proceso', solucionId: '21', potencial: 40 },
    { value: '311', label: 'Lavado de utensilios', solucionId: '31', potencial: 50 },
    { value: '312', label: 'Desinfección de alimentos', solucionId: '31', potencial: 50 },
]
export const PRODUCTOS = [
    {
        sku: 'KEY-101',
        nombre: 'Limpiador neutro 5 L',
        categoria: 'Limpieza general',
        precioLista: 420,
        precioMinimo: 350,
    },
    {
        sku: 'KEY-102',
        nombre: 'Desinfectante de superficies 5 L',
        categoria: 'Desinfección',
        precioLista: 580,
        precioMinimo: 480,
    },
    {
        sku: 'KEY-103',
        nombre: 'Desengrasante industrial 20 L',
        categoria: 'Industria',
        precioLista: 1850,
        precioMinimo: 1550,
    },
    {
        sku: 'KEY-104',
        nombre: 'Jabón antibacterial 4 L',
        categoria: 'Higiene personal',
        precioLista: 390,
        precioMinimo: 320,
    },
    {
        sku: 'KEY-105',
        nombre: 'Detergente para utensilios 5 L',
        categoria: 'Cocina',
        precioLista: 460,
        precioMinimo: 380,
    },
    {
        sku: 'KEY-106',
        nombre: 'Sanitizante de alimentos 1 L',
        categoria: 'Cocina',
        precioLista: 260,
        precioMinimo: 210,
    },
]
export const MOTIVOS_CANCELACION = [
    'Sin presupuesto',
    'Eligió otro proveedor',
    'Proyecto pospuesto',
    'Sin interés',
    'Otro',
]
export const MOTIVOS_PRECIO = [
    'Precios de competencia',
    'Tiene convenio',
    'Es cuenta nacional',
    'Precio por licitación',
    'Otro',
]
export function catalogName(catalog: readonly { value: string; label: string }[], id: string) {
    return catalog.find((item) => item.value === id)?.label ?? 'Sin definir'
}
