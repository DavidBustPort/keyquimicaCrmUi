export type ExportMode = 'all' | 'kpi' | 'database'
export interface ReportFilters {
    view: 'central' | 'gerente' | 'representante'
    group: string
    branches: string[]
    representative: string
    start: string
    end: string
    clientType: string
    stage: string
    category: string
    uen: string
    segment: string
    saleType: string
    supplier: string
    mode: ExportMode
}
export interface ReportRow {
    id: number
    month: string
    branch: string
    representative: string
    client: string
    clientType: string
    stage: string
    category: string
    uen: string
    segment: string
    saleType: string
    supplier: string
    amount: number
}
export interface ReportOption {
    value: string
    label: string
}
