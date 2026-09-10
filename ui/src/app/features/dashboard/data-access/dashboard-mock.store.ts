import { Injectable, computed, signal } from '@angular/core'
import {
    DashboardData,
    DashboardFilter,
    STAGES,
    percentage,
} from '@features/dashboard/models/dashboard'
export const GROUPS = [
    { value: '1', label: 'CDI PROPIOS' },
    { value: '2', label: 'CDC PROPIOS' },
    { value: '3', label: 'CDI FRANQUICIAS' },
    { value: '4', label: 'CDC FRANQUICIAS' },
]
export const BRANCHES = [
    { value: '1', label: 'Chihuahua Norte', group: '1' },
    { value: '2', label: 'Chihuahua Sur', group: '1' },
    { value: '3', label: 'Ciudad Juárez', group: '2' },
    { value: '4', label: 'Delicias', group: '3' },
    { value: '5', label: 'Cuauhtémoc', group: '4' },
]
export const REPS = [
    { value: '1', label: 'Ana Torres', branch: '1' },
    { value: '2', label: 'Luis Mendoza', branch: '1' },
    { value: '3', label: 'María García', branch: '2' },
    { value: '4', label: 'Carlos Molina', branch: '3' },
    { value: '5', label: 'Sofía Reyes', branch: '4' },
    { value: '6', label: 'Laura Méndez', branch: '5' },
]
export function monthIndex(value: string) {
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value) || Number(value.slice(0, 4)) < 1) return NaN
    return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1
}
export function currentMonth() {
    const date = new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}
interface Fact {
    month: number
    rep: string
    branch: string
    stage: number
    amount: number
    count: number
    leads: number
    days: number[]
    id: number
    client: string
}
@Injectable({ providedIn: 'root' })
export class DashboardMockStore {
    readonly filter = signal<DashboardFilter>({
        start: currentMonth(),
        end: currentMonth(),
        mode: 'central',
        group: '1',
        branches: ['1', '2'],
        representatives: ['1', '2', '3'],
    })
    readonly error = signal('')
    readonly refreshed = signal(false)
    private readonly facts: Fact[] = Array.from({ length: 12 }, (_, offset) =>
        REPS.flatMap((rep, r) =>
            STAGES.map((_, stage) => ({
                month: monthIndex(currentMonth()) - offset,
                rep: rep.value,
                branch: rep.branch,
                stage,
                amount: Math.round((80000 - stage * 16000) * (1 + r * 0.16) * (1 - offset * 0.025)),
                count: Math.max(1, 16 - stage * 3 + r - (offset % 3)),
                leads: Math.max(1, 5 - stage + (r % 2)),
                days: [3 + r, 6 + r, 10 + r + (offset % 3)],
                id: 1000 + offset * 100 + r * 10 + stage,
                client: [
                    'Hotel Sierra Norte',
                    'Clínica del Valle',
                    'Alimentos Las Cumbres',
                    'Industrias del Norte',
                    'Hotel Mirador',
                    'Servicios del Centro',
                ][r],
            })),
        ),
    ).flat()
    readonly data = computed<DashboardData>(() => {
        const f = this.filter()
        const start = monthIndex(f.start)
        const end = monthIndex(f.end)
        const months = end - start + 1
        const branches = f.mode === 'central' ? f.branches : ['1']
        const reps = f.mode === 'representante' ? ['1'] : f.representatives
        const scoped = this.facts.filter(
            (row) => branches.includes(row.branch) && reps.includes(row.rep),
        )
        const current = scoped.filter((row) => row.month >= start && row.month <= end)
        const previous = scoped.filter((row) => row.month >= start - 3 && row.month < start)
        const total = current.reduce((sum, row) => sum + row.amount, 0)
        const count = current.reduce((sum, row) => sum + row.count, 0)
        const previousTotal = previous.reduce((sum, row) => sum + row.amount, 0)
        const stages = STAGES.map((stage, i) => {
            const rows = current.filter((row) => row.stage === i)
            const old = previous.filter((row) => row.stage === i)
            const amount = rows.reduce((sum, row) => sum + row.amount, 0)
            const previousAmount = old.reduce((sum, row) => sum + row.amount, 0) / 3
            return {
                ...stage,
                amount,
                count: rows.reduce((sum, row) => sum + row.count, 0),
                share: percentage(amount, total),
                previousAmount,
                previousCount: old.reduce((sum, row) => sum + row.count, 0) / 3,
                previousShare: percentage(previousAmount, previousTotal / 3),
            }
        })
        const units = new Set(current.map((row) => row.month + '-' + row.rep)).size
        const sources = current.reduce(
            (sum, row) => ({
                leads: sum.leads + row.leads,
                prospectos: sum.prospectos + row.count - row.leads,
            }),
            { leads: 0, prospectos: 0 },
        )
        const times = STAGES.slice(0, 3).map((stage, i) => {
            const reached = current.filter((row) => row.stage > i)
            return {
                from: stage.name,
                to: STAGES[i + 1].name,
                days: reached.length
                    ? Math.round(
                          (reached.reduce((sum, row) => sum + row.days[i], 0) / reached.length) *
                              10,
                      ) / 10
                    : null,
            }
        })
        return {
            stages,
            pipeline: stages.slice(0, 3).reduce((sum, s) => sum + s.amount, 0),
            closed: stages[3].amount,
            closeGoal: units * 40000,
            pipelineGoal: units * 200000,
            newProjectsGoal: units * 90000,
            newProjects: current
                .filter((row) => row.stage === 0)
                .reduce((sum, row) => sum + row.amount, 0),
            opportunities: [...current]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((row) => ({
                    id: row.id,
                    client: row.client,
                    clientId: 40 + Number(row.rep),
                    amount: row.amount,
                    stage: STAGES[row.stage].name,
                    color: STAGES[row.stage].color,
                })),
            sources: [
                { name: 'Prospectos', count: sources.prospectos, color: '#00a3ff' },
                { name: 'Leads', count: sources.leads, color: '#a855f7' },
            ],
            times,
            totalDays: current.length
                ? Math.round(times.reduce((sum, t) => sum + (t.days ?? 0), 0) * 10) / 10
                : null,
            monthCount: months,
            total,
            count,
        }
    })
    apply(filter: DashboardFilter) {
        const start = monthIndex(filter.start)
        const end = monthIndex(filter.end)
        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
            this.error.set(
                'Selecciona un periodo válido: el mes inicial debe ser anterior o igual al final.',
            )
            return false
        }
        const branches =
            filter.mode === 'central'
                ? filter.branches.filter((id) =>
                      BRANCHES.some(
                          (b) => b.value === id && (!filter.group || b.group === filter.group),
                      ),
                  )
                : ['1']
        const representatives =
            filter.mode === 'representante'
                ? ['1']
                : filter.representatives.filter((id) =>
                      REPS.some((rep) => rep.value === id && branches.includes(rep.branch)),
                  )
        this.filter.set({
            ...filter,
            branches: [...branches],
            representatives: [...representatives],
        })
        this.error.set('')
        this.refreshed.set(true)
        return true
    }
}
