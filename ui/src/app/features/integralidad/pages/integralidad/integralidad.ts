import { Drawer } from '@shared/ui/drawer/drawer'
import { OportunidadesApiService } from '@features/oportunidades/data-access/oportunidades-api.service'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { CurrencyPipe, DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, firstValueFrom, of, Subject, switchMap } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { UserRole } from '@core/auth/auth.model'
import { ReportesApiService } from '@features/reportes/data-access/reportes-api.service'
import { ReportOption } from '@features/reportes/models/reporte'
import { IntegralidadApiService } from '@features/integralidad/data-access/integralidad-api.service'
import { groupClients, IntegralidadClient, IntegralidadQuery, IntegralidadRow } from '@features/integralidad/models/integralidad'
import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { Modal } from '@shared/ui/modal/modal'
import { Pagination } from '@shared/ui/pagination/pagination'
import { TableLoading } from '@shared/ui/table-loading/table-loading'
import { ScrollToResults } from '@shared/directives/scroll-to-results'
@Component({ selector: 'app-integralidad', imports: [Drawer, CurrencyPipe, DecimalPipe, FormsModule, MonthCalendar, Modal, Pagination, TableLoading, ScrollToResults], templateUrl: './integralidad.html' })
export class Integralidad {
	private readonly router = inject(Router)
	private readonly opportunities = inject(OportunidadesApiService)
	readonly opening = signal(false)
	readonly matrix = signal<IntegralidadRow[]>([])
	readonly summary = computed(() => ({
		vpt: this.clients().reduce((s, c) => s + c.row.vpt, 0),
		vpo: this.clients().reduce((s, c) => s + c.row.vpo, 0),
		coverageVpt: this.matrix()[0]?.coverageVpt ?? 0,
		coverageVpo: this.matrix()[0]?.coverageVpo ?? 0,
		integralidad: this.clients().length ? this.clients().reduce((s, c) => s + c.integralidad, 0) / this.clients().length : 0,
		potential: this.clients().length ? this.clients().reduce((s, c) => s + c.potential, 0) / this.clients().length : 0
	}))
	readonly auth = inject(AuthStore)
	readonly rik = inject(RikFilterStore)
	private readonly api = inject(IntegralidadApiService)
	private readonly catalogs = inject(ReportesApiService)
	readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral())
	readonly period = signal(this.currentPeriod())
	readonly uen = signal('')
	readonly segment = signal('')
	readonly search = signal('')
	readonly uens = signal<ReportOption[]>([])
	readonly segments = signal<ReportOption[]>([])
	readonly rows = signal<IntegralidadRow[]>([])
	readonly clients = computed(() => groupClients(this.rows()))
	readonly filtered = computed(() => this.clients().filter((c) => (c.row.clientId + ' ' + c.row.client).toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())))
	readonly page = signal(1)
	readonly size = signal(10)
	readonly visible = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()))
	readonly totalSale = computed(() => this.clients().reduce((s, c) => s + c.sale, 0))
	readonly loading = signal(false)
	readonly catalogLoading = signal(false)
	readonly error = signal('')
	readonly notice = signal('')
	readonly catalogError = signal('')
	readonly expanded = signal<number | null>(null)
	readonly detailSold = signal(false)
	readonly detailClient = computed(() => this.clients().find((c) => c.row.clientId === this.expanded()) ?? null)
	readonly detailIndex = computed(() => this.filtered().findIndex((c) => c.row.clientId === this.expanded()))
	moveDetail(direction: number) {
		const client = this.filtered()[this.detailIndex() + direction]
		if (client) this.expanded.set(client.row.clientId)
	}
	readonly selected = signal<IntegralidadClient | null>(null)
	readonly saving = signal(false)
	readonly exporting = signal(false)
	readonly editError = signal('')
	readonly applied = signal<IntegralidadQuery | null>(null)
	quantity = 0
	vpo = 0
	readonly editable = computed(() => this.auth.session().role === UserRole.Rik && this.applied()?.Year === new Date().getFullYear() && this.applied()?.Month === new Date().getMonth() + 1)
	private readonly requests = new Subject<IntegralidadQuery | null>()
	private scope = 0
	private catalogVersion = 0
	private segmentVersion = 0
	constructor() {
		this.requests
			.pipe(
				switchMap((q) => (q ? this.api.list(q).pipe(catchError(() => of(null))) : of(null))),
				takeUntilDestroyed()
			)
			.subscribe((r) => {
				this.loading.set(false)
				if (r) {
					this.rows.set(r.rows)
					this.matrix.set(r.totals)
				} else if (this.allowed()) this.error.set('No se pudo cargar la integralidad. Intenta nuevamente.')
			})
		effect(() => {
			this.auth.session()
			this.allowed()
			this.rik.selectedRikId()
			untracked(() => {
				this.scope++
				this.catalogVersion++
				this.segmentVersion++
				this.uen.set('')
				this.segment.set('')
				this.segments.set([])
				this.selected.set(null)
				this.rows.set([])
				this.expanded.set(null)
				this.error.set('')
				this.notice.set('')
				if (this.allowed()) {
					void this.loadCatalogs()
					this.apply()
				} else {
					this.requests.next(null)
					this.error.set('')
				}
			})
		})
	}
	currentPeriod() {
		const d = new Date()
		return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
	}
	async loadCatalogs() {
		const version = ++this.catalogVersion
		this.catalogLoading.set(true)
		this.catalogError.set('')
		try {
			const rows = await firstValueFrom(this.catalogs.catalog('uens'))
			if (version === this.catalogVersion) this.uens.set(rows)
		} catch {
			if (version === this.catalogVersion) this.catalogError.set('No se pudieron cargar los filtros.')
		} finally {
			if (version === this.catalogVersion) this.catalogLoading.set(false)
		}
	}
	async changeUen(value: string) {
		this.uen.set(value)
		this.segment.set('')
		this.segments.set([])
		const version = ++this.segmentVersion
		this.catalogLoading.set(false)
		this.catalogError.set('')
		if (!value) return
		this.catalogLoading.set(true)
		try {
			const rows = await firstValueFrom(this.catalogs.catalog('segmentos', { uenId: value }))
			if (version === this.segmentVersion) this.segments.set(rows)
		} catch {
			if (version === this.segmentVersion) this.catalogError.set('No se pudieron cargar los segmentos.')
		} finally {
			if (version === this.segmentVersion) this.catalogLoading.set(false)
		}
	}
	apply() {
		if (!this.allowed()) return
		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(this.period())) {
			this.error.set('Selecciona un periodo válido.')
			return
		}
		const q = {
			Month: Number(this.period().slice(5)),
			Year: Number(this.period().slice(0, 4)),
			UenId: this.uen() ? Number(this.uen()) : null,
			SegmentId: this.segment() ? Number(this.segment()) : null,
			ClientId: null,
			RikId: this.auth.isManager() ? this.rik.selectedRikId() : null,
			IsManager: this.auth.isManager()
		}
		this.error.set('')
		this.rows.set([])
		this.expanded.set(null)
		this.page.set(1)
		this.applied.set(q)
		this.loading.set(true)
		this.requests.next(q)
	}
	clear() {
		this.segmentVersion++
		this.catalogLoading.set(false)
		this.period.set(this.currentPeriod())
		this.uen.set('')
		this.segment.set('')
		this.search.set('')
		this.segments.set([])
		this.apply()
	}
	filterClient(value: string) {
		this.search.set(value)
		this.page.set(1)
	}
	toggle(id: number) {
		this.detailSold.set(false)
		this.expanded.set(id)
	}
	tone(value: number, application = false) {
		return value <= (application ? 50 : 60) ? 'bg-red-50 text-red-700' : value <= (application ? 70 : 80) ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
	}
	apps(client: IntegralidadClient, sold: boolean) {
		return client.applications.filter((a) => (sold ? a.sale > 0 : a.sale <= 0))
	}
	categories(client: IntegralidadClient) {
		const totals = new Map<string, number>()
		for (const row of this.rows().filter((r) => r.clientId === client.row.clientId)) totals.set(row.category || 'Sin categoría', (totals.get(row.category || 'Sin categoría') ?? 0) + row.sale)
		return [...totals].map(([name, sale]) => ({ name, percent: client.sale ? (sale / client.sale) * 100 : 0 }))
	}
	edit(client: IntegralidadClient) {
		this.selected.set(client)
		this.quantity = client.row.quantity
		this.vpo = client.row.vpo
		this.editError.set('')
	}
	async openCrm(client: IntegralidadClient) {
		if (this.auth.isManager() || this.opening()) return
		const scope = this.scope
		this.opening.set(true)
		this.error.set('')
		try {
			const matches = await firstValueFrom(this.opportunities.clientes(String(client.row.clientId)))
			if (scope !== this.scope) return
			const match = matches.find((c) => c.id === client.row.clientId)
			if (!match?.prospectoId) throw new Error('No se encontró el registro CRM de este cliente. Verifica su alta en Prospectos.')
			await this.router.navigate(['/oportunidades-proyectos/oportunidades', match.prospectoId])
		} catch (e) {
			if (scope === this.scope) this.error.set(e instanceof Error ? e.message : 'No se pudo abrir el cliente.')
		} finally {
			this.opening.set(false)
		}
	}
	async save() {
		const client = this.selected(),
			q = this.applied()
		if (!client || !q || !this.editable() || this.saving()) return
		if (!Number.isFinite(this.quantity) || !Number.isFinite(this.vpo) || this.quantity < 0 || this.vpo < 0) {
			this.editError.set('Ingresa cantidades válidas, mayores o iguales a cero.')
			return
		}
		this.saving.set(true)
		const scope = this.scope
		try {
			await firstValueFrom(this.api.save({ clientId: client.row.clientId, territoryId: client.row.territoryId, segmentId: client.row.segmentId, uenId: client.row.uenId, month: q.Month, year: q.Year, quantity: this.quantity, vpo: this.vpo }))
			if (scope !== this.scope) return
			this.selected.set(null)
			this.notice.set('Potenciales actualizados.')
			this.apply()
		} catch (e) {
			this.editError.set(e instanceof Error ? e.message : 'No se pudieron guardar los potenciales.')
		} finally {
			this.saving.set(false)
		}
	}
	async download(detailed: boolean) {
		const q = this.applied()
		if (!q || this.exporting() || this.loading() || !this.clients().length) return
		this.exporting.set(true)
		const scope = this.scope
		try {
			const blob = await firstValueFrom(this.api.export(q, detailed))
			if (scope !== this.scope) return
			if (!blob.size || blob.type.includes('json')) throw Error()
			const url = URL.createObjectURL(blob),
				a = document.createElement('a')
			a.href = url
			a.download = detailed ? 'integralidad-detalle.xlsx' : 'integralidad.xlsx'
			a.click()
			setTimeout(() => URL.revokeObjectURL(url), 1000)
		} catch {
			this.error.set('No se pudo descargar el reporte.')
		} finally {
			this.exporting.set(false)
		}
	}
}
