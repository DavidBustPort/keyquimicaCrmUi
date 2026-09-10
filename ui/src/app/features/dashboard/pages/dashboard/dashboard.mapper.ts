import { DashboardData as ApiData } from './dashboard.model'
import { DashboardData, STAGES } from '../../models/dashboard'
import {
    EtapasOportunidadesName,
    EtapasOportunidadesColor,
} from '@app/core/models/etapas-oportunidades.model'
export function mapDashboard(raw: ApiData | undefined): DashboardData {
    const stages = STAGES.map((stage, i) => {
        const current = raw?.estadisticasPorEtapa?.find(
            (e) => e.etapa === i + 1 && e.periodo === 'Actual',
        )
        const previous = raw?.estadisticasPorEtapa?.find(
            (e) => e.etapa === i + 1 && e.periodo === 'TresMesesAtras',
        )
        return {
            ...stage,
            amount: current?.totalVpoAlCierre ?? 0,
            count: current?.cantidadOportunidades ?? 0,
            share: current?.porcentaje ?? 0,
            previousAmount: previous?.totalVpoAlCierre ?? 0,
            previousCount: previous?.cantidadOportunidades ?? 0,
            previousShare: previous?.porcentaje ?? 0,
        }
    })
    return {
        stages,
        pipeline: raw?.totalesPorEtapas?.embudo ?? 0,
        closed: raw?.totalesPorEtapas?.cierre ?? 0,
        closeGoal: raw?.totalesPorEtapas?.metaMensualCierre ?? 0,
        pipelineGoal: raw?.cumplimientoPresupuestoEmbudo?.metaMensualEmbudo ?? 0,
        pipelineBudget: raw?.cumplimientoPresupuestoEmbudo?.totalEmbudo ?? 0,
        metricAmounts: [
            raw?.totalesPorEtapas?.analisis ?? 0,
            raw?.totalesPorEtapas?.promocion ?? 0,
            raw?.totalesPorEtapas?.negociacion ?? 0,
        ],
        newProjectsGoal:
            raw?.cumplimientoPresupuestoProyectosNuevos?.metaMensualProyectosNuevos ?? 0,
        newProjects: raw?.cumplimientoPresupuestoProyectosNuevos?.totalProyectosNuevos ?? 0,
        opportunities: [...(raw?.oportunidadesImportantes ?? [])]
            .sort((a, b) => b.vpoAlCierre - a.vpoAlCierre)
            .slice(0, 5)
            .map((o) => ({
                id: o.idOportunidad,
                client: o.cliente,
                clientId: o.idCliente,
                amount: o.vpoAlCierre,
                stage: EtapasOportunidadesName[o.etapa] ?? 'Sin etapa',
                color: EtapasOportunidadesColor[o.etapa] ?? '#64748b',
            })),
        sources: [
            { name: 'Prospectos', count: raw?.fuentes?.prospectos ?? 0, color: '#00a3ff' },
            { name: 'Leads', count: raw?.fuentes?.leads ?? 0, color: '#a855f7' },
        ],
        times: (raw?.tiempoPorEtapas?.etapas ?? []).map((t) => ({
            from: EtapasOportunidadesName[t.etapas[0]] ?? t.titulo,
            to: EtapasOportunidadesName[t.etapas[1]] ?? '',
            days: t.totalDias,
        })),
        totalDays: raw?.tiempoPorEtapas?.promedioDiasTotal ?? null,
        monthCount: 1,
        total: stages.reduce((sum, s) => sum + s.amount, 0),
        count: stages.reduce((sum, s) => sum + s.count, 0),
    }
}
