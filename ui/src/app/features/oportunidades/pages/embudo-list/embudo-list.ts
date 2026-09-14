import { latestSearch } from '@shared/rxjs/latest-search'
import { ClientePicker } from '@features/oportunidades/components/cliente-picker/cliente-picker'
import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { TableLoading } from '@shared/ui/table-loading/table-loading'
import { ScrollToResults } from '@shared/directives/scroll-to-results'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { CurrencyPipe, DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, firstValueFrom, of, Subject } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { Catalogo, Embudo, EmbudoQuery, ETAPAS } from '../../models/oportunidad'
import { OportunidadesApiService } from '../../data-access/oportunidades-api.service'
import { Pagination } from '@shared/ui/pagination/pagination'
import { Modal } from '@shared/ui/modal/modal'
@Component({ selector: 'app-embudo-list', imports: [ClientePicker, MonthCalendar, TableLoading, ScrollToResults, CurrencyPipe, DatePipe, FormsModule, RouterLink, Pagination, Modal], templateUrl: './embudo-list.html' })
export class EmbudoList {
	readonly auth = inject(AuthStore)
	readonly rik = inject(RikFilterStore)
	readonly api = inject(OportunidadesApiService)
	readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral())
	readonly canEdit = computed(() => this.allowed() && this.auth.session().role === UserRole.Rik)
	readonly clientPickerOpen = signal(false)
	readonly rows = signal<Embudo[]>([])
	readonly total = signal(0)
	readonly page = signal(1)
	readonly size = signal(10)
	readonly loading = signal(false)
	readonly saving = signal(false)
	readonly exporting = signal(false)
	readonly error = signal('')
	readonly notice = signal('')
	readonly filters = signal({ search: '', period: '', etapa: '' })
	readonly hasActiveFilters = computed(() => Object.values(this.filters()).some((value) => value.trim() !== ''))
	readonly stages = ETAPAS
	saleType(value: string) {
		const type = (value ?? '')
			.trim()
			.toUpperCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
		if (['VI', '1', 'INSTALADA', 'VENTA INSTALADA'].includes(type)) return { label: 'VI', title: 'Venta instalada' }
		if (['VE', '2', 'ESPORADICA', 'VENTA ESPORADICA'].includes(type)) return { label: 'VE', title: 'Venta esporádica' }
		return { label: value || '—', title: value || 'Tipo de venta sin especificar' }
	}
	readonly selected = signal<Embudo | null>(null)
	readonly action = signal('detail')
	readonly reasons = signal<Catalogo[]>([])
	reason = 0
	vpo = 0
	private scope = 0
	private readonly requests = new Subject<EmbudoQuery | null>()
	readonly query = computed<EmbudoQuery>(() => {
		const f = this.filters()
		return {
			isGte: this.auth.isManager(),
			page: this.page(),
			itemsPerPage: this.size(),
			filterNombreEmpresa: f.search.trim(),
			filterMonth: f.period ? Number(f.period.slice(5)) : undefined,
			filterYear: f.period ? Number(f.period.slice(0, 4)) : undefined,
			filterEtapa: f.etapa ? Number(f.etapa) : undefined,
			filterRik: this.auth.isManager() ? this.rik.selectedRikId() : null
		}
	})
	constructor() {
		effect((onCleanup) => {
			if (!this.notice()) return
			const timeout = setTimeout(() => this.notice.set(''), 3000)
			onCleanup(() => clearTimeout(timeout))
		})
		this.requests
			.pipe(
				latestSearch(
					(q) => (q ? (q.filterNombreEmpresa ?? '') : null),
					(q) => (q ? this.api.embudo(q).pipe(catchError((error) => of({ error }))) : of(null))
				),
				takeUntilDestroyed()
			)
			.subscribe((r) => {
				this.loading.set(false)
				if (!r) return
				if ('error' in r) {
					this.error.set(r.error instanceof Error ? r.error.message : 'No se pudo cargar el embudo.')
					return
				}
				const last = Math.max(1, Math.ceil(r.totalRows / this.size()))
				if (this.page() > last) {
					this.page.set(last)
					return
				}
				this.rows.set(r.oportunidades)
				this.total.set(r.totalRows)
			})
		effect(() => {
			this.auth.session()
			this.rik.selectedRikId()
			untracked(() => {
				this.scope++
				this.clientPickerOpen.set(false)
				this.page.set(1)
				this.selected.set(null)
				this.notice.set('')
				this.reasons.set([])
			})
		})
		effect(() => {
			const q = this.query(),
				allowed = this.allowed()
			this.auth.session()
			untracked(() => this.load(allowed ? q : null))
		})
	}
	private load(q: EmbudoQuery | null) {
		this.rows.set([])
		this.total.set(0)
		this.error.set('')
		this.loading.set(!!q)
		this.requests.next(q)
	}
	refresh() {
		this.load(this.allowed() ? this.query() : null)
	}
	filter(key: 'search' | 'period' | 'etapa', value: string) {
		this.page.set(1)
		this.filters.update((f) => ({ ...f, [key]: value }))
	}
	clear() {
		this.page.set(1)
		this.filters.set({ search: '', period: '', etapa: '' })
	}
	open(p: Embudo) {
		this.selected.set(p)
		this.action.set('detail')
		this.vpo = p.vpo
		this.reason = 0
		this.error.set('')
	}
	async cancelDialog() {
		this.error.set('')
		const scope = this.scope
		try {
			const reasons = await firstValueFrom(this.api.catalogo('motivos'))
			if (scope !== this.scope) return
			this.reasons.set(reasons)
			this.action.set('cancel')
		} catch (e) {
			this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los motivos.')
		}
	}
	async execute(action: 'vpo' | 'cancel' | 'close' | 'negotiate') {
		const p = this.selected()
		if (!p || !this.canEdit() || this.saving() || p.etapa === 5 || (action !== 'vpo' && this.hasPending(p))) return
		if (action === 'vpo' && (!Number.isFinite(this.vpo) || this.vpo <= 0)) {
			this.error.set('VPO inválido.')
			return
		}
		if (action === 'cancel' && !this.reasons().some((r) => r.id === this.reason)) {
			this.error.set('Selecciona un motivo.')
			return
		}
		this.saving.set(true)
		this.notice.set('')
		this.error.set('')
		const scope = this.scope
		try {
			const request = action === 'vpo' ? this.api.vpo(p.idOportunidad, this.vpo) : action === 'cancel' ? this.api.cancel(p.idOportunidad, this.reason) : action === 'close' ? this.api.close(p.idOportunidad) : this.api.negotiate(p.idOportunidad)
			if (!(await firstValueFrom(request))) throw new Error('No se pudo completar la operación.')
			if (scope !== this.scope) return
			this.selected.set(null)
			this.notice.set('Proyecto actualizado.')
			this.refresh()
		} catch (e) {
			if (scope === this.scope) this.error.set(e instanceof Error ? e.message : 'No se pudo actualizar.')
		} finally {
			this.saving.set(false)
		}
	}
	hasPending(p: Embudo) {
		return p.detalle.productos.some((product) => product.estatusAutorizacion)
	}
	async export() {
		if (!this.allowed() || this.exporting()) return
		this.exporting.set(true)
		this.error.set('')
		const scope = this.scope
		try {
			const blob = await firstValueFrom(this.api.export(this.query()))
			if (scope !== this.scope) return
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'oportunidades.xlsx'
			a.click()
			setTimeout(() => URL.revokeObjectURL(url), 1000)
		} catch {
			this.error.set('No se pudo descargar el Excel.')
		} finally {
			this.exporting.set(false)
		}
	}
}
