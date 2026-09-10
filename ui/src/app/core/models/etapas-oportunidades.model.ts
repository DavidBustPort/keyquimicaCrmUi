export const EtapasOportunidades = {
    ANALISIS: 1,
    PROMOCION: 2,
    NEGOCIACION: 3,
    CIERRE: 4,
    CANCELADA: 5,
}

export type EtapasOportunidades = (typeof EtapasOportunidades)[keyof typeof EtapasOportunidades]
export const EtapasOportunidadesName: Record<EtapasOportunidades, string> = {
    [EtapasOportunidades.ANALISIS]: 'Análisis',
    [EtapasOportunidades.PROMOCION]: 'Promoción',
    [EtapasOportunidades.NEGOCIACION]: 'Negociación',
    [EtapasOportunidades.CIERRE]: 'Cierre',
    [EtapasOportunidades.CANCELADA]: 'Cancelada',
}
export const EtapasOportunidadesColor: Record<EtapasOportunidades, string> = {
    [EtapasOportunidades.ANALISIS]: '#00a3ff',
    [EtapasOportunidades.PROMOCION]: '#008be6',
    [EtapasOportunidades.NEGOCIACION]: '#0072cc',
    [EtapasOportunidades.CIERRE]: '#005bb3',
    [EtapasOportunidades.CANCELADA]: '#dc3545',
}
export const EtapasOportunidadesAbbreviation: Record<EtapasOportunidades, string> = {
    [EtapasOportunidades.ANALISIS]: 'A',
    [EtapasOportunidades.PROMOCION]: 'P',
    [EtapasOportunidades.NEGOCIACION]: 'N',
    [EtapasOportunidades.CIERRE]: 'C',
    [EtapasOportunidades.CANCELADA]: 'X',
}
