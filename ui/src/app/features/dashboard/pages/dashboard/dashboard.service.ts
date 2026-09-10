import { Injectable, resource, inject, signal, computed, effect, untracked } from '@angular/core'
import { DashboardApiService } from './dashboard-api.service'
import { firstValueFrom } from 'rxjs'
import { LoadingService } from '@app/core/loading/loading.service'
import { AuthStore } from '@app/core/auth/auth.store'
import { DashboardCatalog, DashboardQuery } from './dashboard.model'
import { RikFilterStore } from '@app/core/filters/rik-filter.store'
import { mapDashboard } from './dashboard.mapper'

const now = () => {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export interface DashboardFiltersState {
	start: string
	end: string
	group: string
	branches: string[]
	representatives: string[]
}
@Injectable()
export class DashboardService {
	private readonly apiService = inject(DashboardApiService)
	private readonly loadingService = inject(LoadingService)
	readonly auth = inject(AuthStore)
	private readonly rikFilter = inject(RikFilterStore)

	readonly filter = signal<DashboardFiltersState>({
		start: now(),
		end: now(),
		group: '1',
		branches: [],
		representatives: []
	})
	readonly applied = signal<DashboardFiltersState | null>(null)
	readonly branches = signal<DashboardCatalog[]>([])
	readonly reps = signal<DashboardCatalog[]>([])
	readonly catalogLoading = signal(false)
	readonly error = signal('')
	private catalogVersion = 0
	private readonly query = signal<DashboardQuery | undefined>(undefined)

	readonly dashboardResource = resource({
		params: () => {
			const query = this.query()
			if (!this.auth.isFullyAuthenticated() || !query) return undefined
			return this.auth.isManager() ? { ...query, RiksId: this.rikFilter.selectedRikId()?.toString() ?? null } : query
		},
		loader: ({ params }) => this.loadingService.wrap(firstValueFrom(this.apiService.getDashboardData(params)))
	})

	readonly data = computed(() => mapDashboard(this.dashboardResource.hasValue() ? this.dashboardResource.value() : undefined))

	constructor() {
		effect(() => {
			const loggedIn = this.auth.isFullyAuthenticated(),
				central = this.auth.isCentral()
			this.auth.session()
			untracked(() => {
				if (loggedIn) void this.initialize(central)
				else {
					++this.catalogVersion
					this.query.set(undefined)
				}
			})
		})
	}

	private async initialize(central: boolean) {
		this.query.set(undefined)
		this.filter.update((f) => ({ ...f, branches: [], representatives: [] }))
		if (central) await this.group(this.filter().group)
		else {
			this.branches.set([])
			await this.loadRiks(null, false)
		}
		if (!this.error()) this.apply()
	}

	retryCatalogs() {
		return this.initialize(this.auth.isCentral())
	}

	async group(group: string) {
		const version = ++this.catalogVersion
		this.filter.update((f) => ({ ...f, group, branches: [], representatives: [] }))
		this.branches.set([])
		this.reps.set([])
		this.error.set('')
		this.catalogLoading.set(!!group)
		if (!group) return
		try {
			const rows = await firstValueFrom(this.apiService.getSucursales(Number(group)))
			if (version !== this.catalogVersion) return
			this.branches.set(rows)
			await this.selectBranches(rows.map((r) => String(r.id)))
		} catch {
			if (version === this.catalogVersion) this.error.set('No se pudieron cargar las sucursales. Vuelve a seleccionar el grupo.')
		} finally {
			if (version === this.catalogVersion) this.catalogLoading.set(false)
		}
	}

	async selectBranches(branches: string[]) {
		this.filter.update((f) => ({ ...f, branches, representatives: [] }))
		await this.loadRiks(branches.length === 1 ? Number(branches[0]) : null, true)
	}

	private async loadRiks(branch: number | null, selectAll: boolean) {
		const version = ++this.catalogVersion
		this.reps.set([])
		this.error.set('')
		this.catalogLoading.set(branch !== null)
		if (branch === null) return
		try {
			const rows = await firstValueFrom(this.apiService.getRiks(branch))
			if (version !== this.catalogVersion) return
			this.reps.set(rows)
			this.filter.update((f) => ({
				...f,
				representatives: selectAll ? rows.map((r) => String(r.id)) : []
			}))
		} catch {
			if (version === this.catalogVersion) this.error.set('No se pudieron cargar los RIKs. Vuelve a seleccionar la sucursal.')
		} finally {
			if (version === this.catalogVersion) this.catalogLoading.set(false)
		}
	}

	updateDate(field: 'start' | 'end', value: string) {
		this.filter.update((f) => ({ ...f, [field]: value }))
	}

	selectReps(representatives: string[]) {
		this.filter.update((f) => ({ ...f, representatives }))
	}

	buildQuery(): DashboardQuery {
		const f = this.filter(),
			[StartYear, StartMonth] = f.start.split('-').map(Number),
			[EndYear, EndMonth] = f.end.split('-').map(Number)
		return {
			StartYear,
			StartMonth,
			EndYear,
			EndMonth,
			IsManager: this.auth.isManager(),
			SucursalesId: this.auth.isCentral() ? f.branches.join(',') : null,
			RiksId: this.auth.isCentral() ? f.representatives.join(',') || null : this.auth.isManager() ? (this.rikFilter.selectedRikId()?.toString() ?? null) : null
		}
	}

	apply() {
		if (!this.auth.isFullyAuthenticated() || this.catalogLoading()) return false
		const f = this.filter()
		if (![f.start, f.end].every((d) => /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(d)) || f.start > f.end) {
			this.error.set('Selecciona un periodo válido: Desde debe ser anterior o igual a Hasta.')
			return false
		}
		this.error.set('')
		const query = this.buildQuery()
		this.applied.set({ ...f })
		if (JSON.stringify(query) === JSON.stringify(this.query())) this.dashboardResource.reload()
		else this.query.set(query)
		return true
	}
}
