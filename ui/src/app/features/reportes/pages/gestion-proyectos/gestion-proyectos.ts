import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { MultiSelect } from '@shared/ui/multi-select/multi-select'
import { ReportesApiService } from '@features/reportes/data-access/reportes-api.service'
import { defaults, ReportFilters, ReportOption, ReportQuery, validPeriod } from '@features/reportes/models/reporte'
@Component({ host: { class: 'block' }, selector: 'app-gestion-proyectos', imports: [FormsModule, MultiSelect, MonthCalendar], templateUrl: './gestion-proyectos.html' })
export class GestionProyectos {
	readonly auth = inject(AuthStore)
	private readonly rik = inject(RikFilterStore)
	private readonly api = inject(ReportesApiService)
	readonly filters = signal(defaults())
	readonly error = signal('')
	readonly status = signal('')
	readonly busy = signal(false)
	readonly catalogError = signal('')
	readonly loading = signal(false)
	readonly branchesLoading = signal(false)
	readonly segmentsLoading = signal(false)
	readonly branches = signal<ReportOption[]>([])
	readonly uens = signal<ReportOption[]>([])
	readonly segments = signal<ReportOption[]>([])
	readonly categories = signal<ReportOption[]>([])
	readonly suppliers = signal<ReportOption[]>([])
	readonly groups = [
		{ value: '1', label: 'CDI PROPIOS' },
		{ value: '2', label: 'CDC PROPIOS' },
		{ value: '3', label: 'CDI FRANQUICIAS' },
		{ value: '4', label: 'CDC FRANQUICIAS' }
	]
	readonly staticOptions = {
		clientType: [
			{ value: 'TD', label: 'Cliente TD (Tradicional)' },
			{ value: 'LD', label: 'Cliente LD (Leads)' }
		],
		stage: ['Análisis', 'Promoción', 'Negociación', 'Cierre', 'Cancelada'].map((label, i) => ({ value: String(i + 1), label })),
		saleType: [
			{ value: 'VI', label: 'Venta Instalada' },
			{ value: 'VE', label: 'Venta Esporádica' }
		]
	}
	readonly fields: { key: 'clientType' | 'stage' | 'category' | 'uen' | 'segment' | 'saleType' | 'supplier'; title: string }[] = [
		{ key: 'clientType', title: 'Tipo de cliente / prospecto' },
		{ key: 'stage', title: 'Etapa de oportunidad' },
		{ key: 'category', title: 'Categoría de productos' },
		{ key: 'uen', title: 'UEN' },
		{ key: 'segment', title: 'Segmento' },
		{ key: 'saleType', title: 'Tipo de venta' },
		{ key: 'supplier', title: 'Proveedor de productos' }
	]
	readonly dirty = computed(() => JSON.stringify(this.filters()) !== JSON.stringify({ ...defaults(), branches: this.auth.isCentral() ? this.branches().map((b) => b.value) : [] }))
	private version = 0
	private branchVersion = 0
	private segmentVersion = 0
	constructor() {
		effect(() => {
			this.auth.session()
			this.auth.isFullyAuthenticated()
			untracked(() => {
				this.version++
				this.branchVersion++
				this.segmentVersion++
				this.filters.set(defaults())
				this.branches.set([])
				this.uens.set([])
				this.segments.set([])
				this.categories.set([])
				this.suppliers.set([])
				this.loading.set(false)
				this.branchesLoading.set(false)
				this.segmentsLoading.set(false)
				this.error.set('')
				this.status.set('')
				this.catalogError.set('')
				if (this.auth.isFullyAuthenticated()) void this.loadCatalogs()
			})
		})
	}
	options(key: (typeof this.fields)[number]['key']) {
		return key === 'category' ? this.categories() : key === 'uen' ? this.uens() : key === 'segment' ? this.segments() : key === 'supplier' ? this.suppliers() : this.staticOptions[key]
	}
	async loadCatalogs() {
		const version = ++this.version
		this.loading.set(true)
		this.catalogError.set('')
		try {
			const [uens, categories, suppliers] = await Promise.all([
				firstValueFrom(this.api.catalog('uens')),
				firstValueFrom(this.api.catalog('tipos-producto')),
				this.auth.isCentral() ? firstValueFrom(this.api.catalog('proveedores-productos')) : Promise.resolve([])
			])
			if (version !== this.version) return
			this.uens.set(uens)
			this.categories.set(categories)
			this.suppliers.set(suppliers)
			if (this.auth.isCentral()) await this.loadBranches()
		} catch (e) {
			if (version === this.version) this.catalogError.set(e instanceof Error ? e.message : 'No se pudieron cargar los catálogos.')
		} finally {
			if (version === this.version) this.loading.set(false)
		}
	}
	async loadBranches() {
		const version = ++this.branchVersion,
			scope = this.version
		this.branches.set([])
		this.filters.update((f) => ({ ...f, branches: [] }))
		this.branchesLoading.set(true)
		try {
			const rows = await firstValueFrom(this.api.catalog('sucursales', { grupoSucursalId: this.filters().group }))
			if (version !== this.branchVersion || scope !== this.version) return
			this.branches.set(rows)
			this.filters.update((f) => ({ ...f, branches: rows.map((r) => r.value) }))
		} catch {
			if (version === this.branchVersion && scope === this.version) this.catalogError.set('No se pudieron cargar las sucursales.')
		} finally {
			if (version === this.branchVersion && scope === this.version) this.branchesLoading.set(false)
		}
	}
	async loadSegments() {
		const version = ++this.segmentVersion,
			scope = this.version
		this.segments.set([])
		this.filters.update((f) => ({ ...f, segment: '' }))
		this.segmentsLoading.set(false)
		if (!this.filters().uen) return
		this.segmentsLoading.set(true)
		try {
			const rows = await firstValueFrom(this.api.catalog('segmentos', { uenId: this.filters().uen }))
			if (version === this.segmentVersion && scope === this.version) this.segments.set(rows)
		} catch {
			if (version === this.segmentVersion && scope === this.version) this.catalogError.set('No se pudieron cargar los segmentos.')
		} finally {
			if (version === this.segmentVersion && scope === this.version) this.segmentsLoading.set(false)
		}
	}
	set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
		this.filters.update((f) => ({ ...f, [key]: value }))
		this.error.set('')
		this.status.set('')
		if (key === 'group') void this.loadBranches()
		if (key === 'uen') void this.loadSegments()
	}
	reset() {
		this.segmentVersion++
		this.segments.set([])
		this.segmentsLoading.set(false)
		this.filters.set(defaults())
		this.error.set('')
		this.status.set('')
		this.catalogError.set('')
		void this.loadCatalogs()
	}
	query(): ReportQuery {
		const f = this.filters(),
			central = this.auth.isCentral()
		return {
			DownloadMode: central ? f.mode : 'all',
			StartMonth: Number(f.start.slice(5)),
			StartYear: Number(f.start.slice(0, 4)),
			EndMonth: Number(f.end.slice(5)),
			EndYear: Number(f.end.slice(0, 4)),
			IsManager: this.auth.isManager(),
			SucursalesId: central && f.branches.length ? f.branches.join(',') : null,
			RikId: this.auth.isManager() ? this.rik.selectedRikId() : null,
			TipoProspecto: f.clientType || null,
			EtapaOportunidad: f.stage ? Number(f.stage) : null,
			Categoria: f.category || null,
			UenId: f.uen ? Number(f.uen) : null,
			UenName: this.uens().find((u) => u.value === f.uen)?.label ?? null,
			SegId: f.segment ? Number(f.segment) : null,
			SegName: this.segments().find((s) => s.value === f.segment)?.label ?? null,
			TipoVenta: f.saleType || null,
			ProveedorProducto: central ? f.supplier || null : null
		}
	}
	async export() {
		if (this.busy() || !this.auth.isFullyAuthenticated() || this.loading() || this.branchesLoading() || this.segmentsLoading() || this.catalogError()) return
		this.error.set('')
		this.status.set('')
		if (!validPeriod(this.filters())) {
			this.error.set('Selecciona un periodo válido: el inicio debe ser anterior o igual al final.')
			return
		}
		if (this.auth.isCentral() && !this.filters().branches.length) {
			this.error.set('Selecciona al menos una sucursal.')
			return
		}
		this.busy.set(true)
		const version = this.version,
			scope = JSON.stringify([this.auth.session(), this.rik.selectedRikId()])
		try {
			const blob = await firstValueFrom(this.api.download(this.query()))
			if (version !== this.version || scope !== JSON.stringify([this.auth.session(), this.rik.selectedRikId()])) return
			if (!blob.size) {
				this.error.set('No se encontraron registros con los filtros seleccionados.')
				return
			}
			if (blob.type.includes('json')) throw new Error('El servidor no pudo generar el reporte.')
			const url = URL.createObjectURL(blob),
				anchor = document.createElement('a')
			anchor.href = url
			anchor.download = 'gestionProyectos.xlsx'
			document.body.appendChild(anchor)
			try {
				anchor.click()
			} finally {
				anchor.remove()
				setTimeout(() => URL.revokeObjectURL(url), 1000)
			}
			this.status.set('Reporte descargado correctamente.')
		} catch (e) {
			if (version === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo descargar el reporte. Intenta nuevamente.')
		} finally {
			this.busy.set(false)
		}
	}
}
