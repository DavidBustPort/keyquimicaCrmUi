import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { ReportesApiService } from '@features/reportes/data-access/reportes-api.service'
import { ReportOption } from '@features/reportes/models/reporte'

@Component({ selector: 'app-commercial-report', imports: [FormsModule, MonthCalendar], templateUrl: './commercial-report.html' })
export class CommercialReport {
	readonly kind = input.required<'tracking-cerrados' | 'prospeccion'>()
	readonly auth = inject(AuthStore)
	readonly rik = inject(RikFilterStore)
	private readonly api = inject(ReportesApiService)
	private readonly destroyRef = inject(DestroyRef)
	readonly tracking = computed(() => this.kind() === 'tracking-cerrados')
	readonly title = computed(() => (this.tracking() ? 'Tracking de proyectos cerrados' : 'Prospección'))
	readonly filters = signal(this.defaults())
	readonly categories = signal<ReportOption[]>([])
	readonly branches = signal<ReportOption[]>([])
	readonly busy = signal(false)
	readonly loading = signal(false)
	readonly error = signal('')
	readonly catalogError = signal('')
	readonly status = signal('')
	private version = 0
	constructor() {
		effect(() => {
			this.kind()
			this.auth.session()
			this.auth.isFullyAuthenticated()
			untracked(() => {
				this.reset()
				void this.loadCatalogs()
			})
		})
	}
	defaults() {
		const date = new Date()
		const period = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
		return { start: period, end: period, category: '', clientType: '', branch: '' }
	}
	reset() {
		this.filters.set(this.defaults())
		this.error.set('')
		this.status.set('')
	}
	set(key: keyof ReturnType<CommercialReport['defaults']>, value: string) {
		this.filters.update((f) => ({ ...f, [key]: value }))
		this.error.set('')
		this.status.set('')
	}
	async loadCatalogs() {
		const version = ++this.version
		this.categories.set([])
		this.branches.set([])
		this.catalogError.set('')
		this.loading.set(false)
		if (!this.auth.isFullyAuthenticated()) return
		this.loading.set(true)
		try {
			const [categories, branches] = await Promise.all([
				this.tracking() ? firstValueFrom(this.api.catalog('tipos-producto').pipe(takeUntilDestroyed(this.destroyRef))) : Promise.resolve([]),
				this.auth.isCentral() ? firstValueFrom(this.api.catalog('sucursales').pipe(takeUntilDestroyed(this.destroyRef))) : Promise.resolve([])
			])
			if (version !== this.version) return
			this.categories.set(categories)
			this.branches.set(branches)
		} catch {
			if (version === this.version) this.catalogError.set('No se pudieron cargar los filtros. Intenta nuevamente.')
		} finally {
			if (version === this.version) this.loading.set(false)
		}
	}
	query() {
		const f = this.filters()
		const common = { IsGte: this.auth.isManager(), IdRik: this.auth.isManager() ? this.rik.selectedRikId() : null, TipoCliente: f.clientType || null, SucursalId: this.auth.isCentral() && f.branch ? Number(f.branch) : null }
		return this.tracking()
			? { ...common, Mes: Number(f.start.slice(5)), Anio: Number(f.start.slice(0, 4)), Categoria: f.category || null }
			: { ...common, MesInicio: Number(f.start.slice(5)), AnioInicio: Number(f.start.slice(0, 4)), MesFinal: Number(f.end.slice(5)), AnioFinal: Number(f.end.slice(0, 4)) }
	}
	async export() {
		if (this.busy() || this.loading() || this.catalogError() || !this.auth.isFullyAuthenticated()) return
		const f = this.filters(),
			valid = (period: string) => /^(19|[2-9]\d)\d{2}-(0[1-9]|1[0-2])$/.test(period)
		this.error.set('')
		this.status.set('')
		if (!valid(f.start) || (!this.tracking() && (!valid(f.end) || f.start > f.end))) {
			this.error.set('Selecciona un periodo válido; el inicio no puede ser posterior al final.')
			return
		}
		const scope = JSON.stringify([this.auth.session(), this.rik.selectedRikId()]),
			version = this.version
		this.busy.set(true)
		try {
			const blob = await firstValueFrom(this.api.downloadReport(this.kind(), this.query()).pipe(takeUntilDestroyed(this.destroyRef)))
			if (version !== this.version || scope !== JSON.stringify([this.auth.session(), this.rik.selectedRikId()])) return
			if (!blob.size) throw new Error('No se encontraron datos para los filtros seleccionados.')
			const url = URL.createObjectURL(blob),
				link = document.createElement('a')
			link.href = url
			link.download = this.kind() + '.xlsx'
			document.body.appendChild(link)
			try {
				link.click()
			} finally {
				link.remove()
				setTimeout(() => URL.revokeObjectURL(url), 1000)
			}
			this.status.set('Reporte descargado correctamente.')
		} catch (e) {
			if (version === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo descargar el reporte.')
		} finally {
			this.busy.set(false)
		}
	}
}
