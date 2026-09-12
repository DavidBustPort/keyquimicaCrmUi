export type ExportMode = 'all' | 'kpi' | 'database'
export interface ReportOption {
	value: string
	label: string
}
export interface ReportCatalog {
	id: number | string
	name: string
}
export interface ReportFilters {
	group: string
	branches: string[]
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
export interface ReportQuery {
	DownloadMode: ExportMode
	StartMonth: number
	StartYear: number
	EndMonth: number
	EndYear: number
	IsManager: boolean
	SucursalesId: string | null
	RikId: number | null
	TipoProspecto: string | null
	EtapaOportunidad: number | null
	Categoria: string | null
	UenId: number | null
	UenName: string | null
	SegId: number | null
	SegName: string | null
	TipoVenta: string | null
	ProveedorProducto: string | null
}
export function defaults(): ReportFilters {
	const date = new Date()
	const month = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
	return { group: '1', branches: [], start: month, end: month, clientType: '', stage: '', category: '', uen: '', segment: '', saleType: '', supplier: '', mode: 'all' }
}
export function validPeriod(f: ReportFilters) {
	return [f.start, f.end].every((v) => /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(v) && Number(v.slice(0, 4)) > 0) && f.start <= f.end
}
