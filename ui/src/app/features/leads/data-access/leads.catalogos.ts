export const SUCURSALES = [
    { value: '1', label: 'Chihuahua Norte', ciudad: 'Chihuahua' },
    { value: '2', label: 'Chihuahua Sur', ciudad: 'Chihuahua' },
    { value: '3', label: 'Ciudad Juárez', ciudad: 'Ciudad Juárez' },
]
export const REPRESENTANTES = [
    { value: '1', label: 'Ana Torres', sucursalId: '1' },
    { value: '2', label: 'Luis Mendoza', sucursalId: '1' },
    { value: '3', label: 'María García', sucursalId: '2' },
    { value: '4', label: 'Carlos Molina', sucursalId: '2' },
    { value: '5', label: 'Sofía Reyes', sucursalId: '3' },
]
export const MOTIVOS_RECHAZO = [
    { value: 'venta-unica', label: 'Venta única' },
    { value: 'costo', label: 'El prospecto decidió no seguir (por costo)' },
    { value: 'no-potencial', label: 'No es prospecto potencial' },
    { value: 'otro', label: 'Otro motivo' },
]
export const ESTADOS = [
    { value: 'Pendiente', label: 'Por asignar' },
    { value: 'Disponible', label: 'Asignado' },
    { value: 'Desarrollado', label: 'Desarrollado' },
    { value: 'Rechazado', label: 'Rechazado / Cancelado' },
]
