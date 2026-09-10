import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, firstValueFrom, of, Subject, switchMap } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { LeadsApiService } from '@features/leads/data-access/leads-api.service'
import { LeadsQuery, mapLead } from '@features/leads/models/leads-api.model'
import { ProspectosApiService } from '@features/prospectos/data-access/prospectos-api.service'
import { Lead } from '@features/leads/models/lead'
import { Pagination } from '@shared/ui/pagination/pagination'
@Component({ selector: 'app-leads-picker', imports: [FormsModule, Pagination], templateUrl: './leads-picker.html' })
export class LeadsPicker {
	readonly requestedId = input<number>()
	readonly selected = output<Lead>()
	private readonly api = inject(LeadsApiService)
	private readonly prospectosApi = inject(ProspectosApiService)
	private readonly auth = inject(AuthStore)
	readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral() && this.auth.session().role === UserRole.Rik)
	readonly rows = signal<Lead[]>([])
	readonly total = signal(0)
	readonly page = signal(1)
	readonly size = signal(10)
	readonly search = signal('')
	readonly loading = signal(false)
	readonly error = signal('')
	readonly notice = signal('')
	readonly rejecting = signal<number | null>(null)
	readonly reason = signal('')
	readonly saving = signal(false)
	private readonly requests = new Subject<LeadsQuery | null>()
	constructor() {
		this.requests
			.pipe(
				switchMap((q) => (q ? this.api.getLeads(q).pipe(catchError((error) => of({ error }))) : of(null))),
				takeUntilDestroyed()
			)
			.subscribe((result) => {
				this.loading.set(false)
				if (!result) return
				if ('error' in result) {
					this.error.set('No se pudieron cargar los leads.')
					return
				}
				this.rows.set(result.data.map(mapLead))
				this.total.set(result.totalRows)
			})
		effect(() => {
			this.auth.session()
			const allowed = this.allowed()
			untracked(() => {
				this.page.set(1)
				this.rejecting.set(null)
				if (allowed) this.load()
				else {
					this.rows.set([])
					this.total.set(0)
					this.loading.set(false)
					this.requests.next(null)
				}
			})
		})
	}
	load() {
		this.rows.set([])
		this.error.set('')
		if (!this.allowed()) return
		this.loading.set(true)
		this.requests.next({ page: this.page(), itemsPerPage: this.size(), isManager: false, rikId: null, filter: this.search().trim() })
	}
	setSearch(value: string) {
		this.search.set(value)
		this.page.set(1)
		this.load()
	}
	use(lead: Lead) {
		if (this.allowed() && lead.estado === 'Disponible' && !this.saving()) this.selected.emit(lead)
	}
	async reject() {
		const id = this.rejecting()
		if (!this.allowed() || id === null || this.saving()) return
		if (!this.reason().trim() || this.reason().trim().length > 500) {
			this.error.set('Escribe un motivo de entre 1 y 500 caracteres.')
			return
		}
		this.saving.set(true)
		try {
			await firstValueFrom(this.prospectosApi.rejectLead(id, this.reason().trim()))
			if (!this.allowed()) return
			this.rejecting.set(null)
			this.notice.set('Lead rechazado correctamente.')
			this.load()
		} catch (e) {
			this.error.set(e instanceof Error ? e.message : 'No se pudo rechazar el lead.')
		} finally {
			this.saving.set(false)
		}
	}
}
