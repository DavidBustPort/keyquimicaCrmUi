export interface IntegralidadRow {
	clientId: number
	client: string
	applicationId: number
	application: string
	opportunityId: number
	territoryId: number
	uenId: number
	uen: string
	segmentId: number
	segment: string
	size: string
	category: string
	sale: number
	vpt: number
	vpo: number
	coverageVpt: number
	coverageVpo: number
	weight: number
	quantity: number
	unitPrice: number
	dimension: string
	representativeId: number
}
export interface ApplicationSummary {
	id: number
	name: string
	sale: number
	weight: number
	potential: number
	coverage: number
	category: string
	opportunityId: number
}
export interface IntegralidadClient {
	row: IntegralidadRow
	sale: number
	coverageVpt: number
	coverageVpo: number
	integralidad: number
	potential: number
	applications: ApplicationSummary[]
}
export function groupClients(rows: IntegralidadRow[]): IntegralidadClient[] {
	const clients = new Map<number, IntegralidadRow[]>()
	for (const row of rows) clients.set(row.clientId, [...(clients.get(row.clientId) ?? []), row])
	return [...clients.values()].map((items) => {
		const grouped = new Map<string, IntegralidadRow[]>()
		for (const row of items) {
			const key = row.applicationId ? String(row.applicationId) : row.application
			grouped.set(key, [...(grouped.get(key) ?? []), row])
		}
		const applications = [...grouped.values()]
			.map((group) => {
				const first = group[0],
					sale = group.reduce((s, r) => s + r.sale, 0)
				const weighted = group.filter((r) => r.weight > 0 && (sale > 0 ? r.sale > 0 : r.sale <= 0))
				const reps = new Set(weighted.map((r) => r.representativeId)).size
				const weight = reps ? weighted.reduce((s, r) => s + r.weight, 0) / reps : 0
				const potential = (first.vpt * weight) / 100
				return { id: first.applicationId, name: first.application, sale, weight, potential, coverage: potential > 0 ? (sale / potential) * weight : 0, category: first.category, opportunityId: first.opportunityId }
			})
			.filter((a) => a.weight > 0)
		return {
			row: items[0],
			sale: items.reduce((s, r) => s + r.sale, 0),
			coverageVpt: items.reduce((s, r) => s + r.coverageVpt, 0),
			coverageVpo: items.reduce((s, r) => s + r.coverageVpo, 0),
			integralidad: applications.filter((a) => a.sale > 0).reduce((s, a) => s + a.weight, 0),
			potential: applications.filter((a) => a.sale <= 0).reduce((s, a) => s + a.weight, 0),
			applications
		}
	})
}
export function normalizeRow(raw: Record<string, unknown>): IntegralidadRow {
	const data = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replaceAll('_', '').toLowerCase(), v]))
	const n = (key: string) => Number(data[key]) || 0,
		t = (key: string) => String(data[key] ?? '')
	return {
		clientId: n('idcte'),
		client: t('cliente'),
		applicationId: n('idapl'),
		application: t('apldescripcion'),
		opportunityId: n('idop'),
		territoryId: n('idter'),
		uenId: n('iduen'),
		uen: t('uendesc'),
		segmentId: n('idseg'),
		segment: t('segdescripcion'),
		size: t('bracket'),
		category: t('tipoproducto').trim(),
		sale: n('venta'),
		vpt: n('vpt'),
		vpo: n('vpo'),
		coverageVpt: n('porccoberturavpt'),
		coverageVpo: n('porccoberturavpo'),
		weight: n('porcentajeaplicacion'),
		quantity: n('cantidad'),
		unitPrice: n('segvalunidim'),
		dimension: t('segunidades'),
		representativeId: n('idusu') || n('idrik')
	}
}
export interface IntegralidadQuery {
	Month: number
	Year: number
	UenId: number | null
	SegmentId: number | null
	ClientId: number | null
	RikId: number | null
	IsManager: boolean
}
