import { EtapasOportunidades } from '@app/core/models/etapas-oportunidades.model'

export interface DashboardData {
    totalesPorEtapas: TotalesPorEtapa
    estadisticasPorEtapa: EstadisticasPorEtapa[]
    fuentes: Fuentes
    oportunidadesImportantes: OportunidadesImportantes[]
    cumplimientoPresupuestoEmbudo: CumplimientoPresupuestoEmbudo
    cumplimientoPresupuestoProyectosNuevos: CumplimientoPresupuestoProyectosNuevos
    tiempoPorEtapas: TiempoPorEtapas
}

export interface TotalesPorEtapa {
    analisis: number
    promocion: number
    negociacion: number
    embudo: number
    cierre: number
    metaMensualCierre: number
}

interface EstadisticasPorEtapa {
    cantidadOportunidades: number
    etapa: EtapasOportunidades
    periodo: 'Actual' | 'TresMesesAtras'
    porcentaje: number
    totalVpoAlCierre: number
}

interface Fuentes {
    leads: number
    prospectos: number
}

interface OportunidadesImportantes {
    etapa: EtapasOportunidades
    cliente: string
    idCliente: number
    idOportunidad: number
    vpoAlCierre: number
}

interface CumplimientoPresupuestoEmbudo {
    metaMensualEmbudo: number
    totalEmbudo: number
}

interface CumplimientoPresupuestoProyectosNuevos {
    metaMensualProyectosNuevos: number
    totalProyectosNuevos: number
}

interface TiempoPorEtapas {
    etapas: TiempoPorEtapaList[]
    promedioDiasTotal: number
    promedioDiasTotalTexto: string
}

interface TiempoPorEtapaList {
    etapas: EtapasOportunidades[]
    titulo: string
    totalDias: number
    totalDiasTexto: string
}

export interface DashboardQuery {
    periodo: 'Actual' | 'TresMesesAtras'
}
