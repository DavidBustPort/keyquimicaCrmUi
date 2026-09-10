export interface DashboardFilter {
    start: string
    end: string
    mode: 'central' | 'gerente' | 'representante'
    group: string
    branches: string[]
    representatives: string[]
}
export interface StageMetric {
    name: string
    color: string
    amount: number
    count: number
    share: number
    previousAmount: number
    previousCount: number
    previousShare: number
}
export interface DashboardData {
    stages: StageMetric[]
    pipeline: number
    closed: number
    closeGoal: number
    pipelineGoal: number
    newProjectsGoal: number
    newProjects: number
    opportunities: {
        id: number
        client: string
        clientId: number
        amount: number
        stage: string
        color: string
    }[]
    sources: { name: string; count: number; color: string }[]
    times: { from: string; to: string; days: number | null }[]
    totalDays: number | null
    monthCount: number
    total: number
    count: number
}
export const STAGES = [
    { name: 'Análisis', color: '#00a3ff' },
    { name: 'Promoción', color: '#008be6' },
    { name: 'Negociación', color: '#0072cc' },
    { name: 'Cierre', color: '#005bb3' },
]
export const percentage = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0
