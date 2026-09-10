import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, firstValueFrom, of, Subject, switchMap } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { ProspectosApiService } from './prospectos-api.service'
import { ProspectoRow, ProspectosQuery } from '@features/prospectos/models/prospecto'
@Injectable({ providedIn: 'root' })
export class ProspectosNotice {
	readonly message = signal('')
}
@Injectable()
export class ProspectosService {
	readonly auth = inject(AuthStore)
	readonly rikFilter = inject(RikFilterStore)
	readonly api = inject(ProspectosApiService)
	readonly notice = inject(ProspectosNotice).message
	readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral())
	readonly canEdit = computed(() => this.allowed() && this.auth.session().role === UserRole.Rik)
	readonly rows = signal<ProspectoRow[]>([])
	readonly total = signal(0)
	readonly page = signal(1)
	readonly size = signal(10)
	readonly loading = signal(false)
	readonly error = signal('')
	readonly exporting = signal(false)
	readonly filters = signal({ search: '', period: '', fuente: '', registro: '', estatus: '', etapa: '', etapaLead: '' })
	private previousScope = ''
	private readonly requests = new Subject<ProspectosQuery | null>()
	readonly query = computed<ProspectosQuery>(() => {
		const f = this.filters()
		return {
			page: this.page(),
			itemsPerPage: this.size(),
			filterMes: f.period ? Number(f.period.slice(5)) : null,
			filterAnio: f.period ? Number(f.period.slice(0, 4)) : null,
			filterNombreProspecto: f.search.trim() || null,
			filterRegistro: f.registro ? Number(f.registro) : null,
			filterFuente: f.fuente || null,
			filterEtapaLead: f.etapaLead || null,
			filterRik: this.auth.isManager() ? this.rikFilter.selectedRikId() : null,
			filterEtapaOportunidad: f.etapa ? Number(f.etapa) : null,
			filterEstatus: f.estatus ? Number(f.estatus) : -1,
			isGte: this.auth.isManager()
		}
	})
	constructor() {
		this.requests
			.pipe(
				switchMap((q) => (q ? this.api.list(q).pipe(catchError((error) => of({ error }))) : of(null))),
				takeUntilDestroyed()
			)
			.subscribe((result) => {
				this.loading.set(false)
				if (!result) return
				if ('error' in result) {
					this.error.set(result.error instanceof Error ? result.error.message : 'No se pudieron cargar los prospectos.')
					return
				}
				const last = Math.max(1, Math.ceil(result.totalRows / this.size()))
				if (this.page() > last) {
					this.page.set(last)
					return
				}
				this.rows.set(result.prospectos)
				this.total.set(result.totalRows)
			})
		effect(() => {
			const scope = JSON.stringify([this.auth.session(), this.rikFilter.selectedRikId()])
			untracked(() => {
				this.page.set(1)
				if (this.previousScope && this.previousScope !== scope) this.notice.set('')
				this.previousScope = scope
			})
		})
		effect(() => {
			const q = this.query(),
				allowed = this.allowed()
			this.auth.session()
			untracked(() => this.load(allowed ? q : null))
		})
	}
	private load(q: ProspectosQuery | null) {
		this.rows.set([])
		this.total.set(0)
		this.error.set('')
		this.loading.set(!!q)
		this.requests.next(q)
	}
	refresh() {
		this.load(this.allowed() ? this.query() : null)
	}
	filter(key: keyof ReturnType<typeof this.filters>, value: string) {
		this.page.set(1)
		this.filters.update((f) => ({ ...f, [key]: value }))
	}
	clear() {
		this.page.set(1)
		this.filters.set({ search: '', period: '', fuente: '', registro: '', estatus: '', etapa: '', etapaLead: '' })
	}
	async download() {
		if (!this.allowed() || this.exporting()) return
		this.exporting.set(true)
		this.error.set('')
		const scope = JSON.stringify([this.auth.session(), this.rikFilter.selectedRikId()])
		try {
			const blob = await firstValueFrom(this.api.export(this.query()))
			if (!this.allowed() || scope !== JSON.stringify([this.auth.session(), this.rikFilter.selectedRikId()])) return
			const url = URL.createObjectURL(blob),
				a = document.createElement('a')
			a.href = url
			a.download = 'prospectos.xlsx'
			document.body.appendChild(a)
			try {
				a.click()
			} finally {
				a.remove()
				setTimeout(() => URL.revokeObjectURL(url), 1000)
			}
		} catch {
			this.error.set('No se pudo descargar el Excel. Intenta nuevamente.')
		} finally {
			this.exporting.set(false)
		}
	}
}
