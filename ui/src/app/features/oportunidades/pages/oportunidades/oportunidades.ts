import { ClientePicker } from '@features/oportunidades/components/cliente-picker/cliente-picker'
import { TableLoading } from '@shared/ui/table-loading/table-loading'
import { DestroyRef } from '@angular/core'
import { Subject, takeUntil } from 'rxjs'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { OportunidadesApiService } from '../../data-access/oportunidades-api.service'
import { ProspectosApiService } from '@features/prospectos/data-access/prospectos-api.service'
import { ProspectoDetail } from '@features/prospectos/models/prospecto'
import { ClienteBusqueda, Proyecto } from '../../models/oportunidad'
import { ProyectoForm } from '../../components/proyecto-form/proyecto-form'
import { ProductosEditor } from '../../components/productos-editor/productos-editor'
import { ProyectosTable } from '../../components/proyectos-table/proyectos-table'
import { Pagination } from '@shared/ui/pagination/pagination'
import { Modal } from '@shared/ui/modal/modal'
@Component({ selector: 'app-oportunidades', imports: [ClientePicker, TableLoading, CurrencyPipe, FormsModule, RouterLink, ProyectoForm, ProductosEditor, ProyectosTable, Pagination, Modal], templateUrl: './oportunidades.html' })
export class Oportunidades {
	readonly auth = inject(AuthStore)
	private readonly searchCancelled = new Subject<void>()
	private readonly destroyRef = inject(DestroyRef)
	readonly api = inject(OportunidadesApiService)
	private readonly prospectos = inject(ProspectosApiService)
	private readonly router = inject(Router)
	private readonly params = toSignal(inject(ActivatedRoute).paramMap)
	readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral() && this.auth.session().role === UserRole.Rik)
	readonly clientPickerOpen = signal(false)
	readonly client = signal<ProspectoDetail | null>(null)
	readonly choices = signal<ClienteBusqueda[]>([])
	readonly projects = signal<Proyecto[]>([])
	readonly selected = signal<Proyecto | null>(null)
	readonly total = signal(0)
	readonly page = signal(1)
	readonly size = signal(5)
	readonly loading = signal(false)
	readonly saving = signal(false)
	readonly error = signal('')
	readonly notice = signal('')
	readonly dirty = signal(false)
	readonly tab = signal('Datos generales')
	readonly enabled = computed(() => this.client()?.registro?.toLowerCase() === 'completo' && (this.client()?.cantidadDimension ?? 0) > 0)
	readonly tabs = ['Datos generales', 'Proyectos', 'Alta proyecto', 'Productos']
	search = ''
	dimension = 0
	private generation = 0
	private searchGeneration = 0
	private projectGeneration = 0
	readonly leave = signal(false)
	private resolveLeave: ((value: boolean) => void) | null = null
	constructor() {
		effect(() => {
			const id = this.params()?.get('prospectoId')
			const projectId = this.params()?.get('oportunidadId')
			const allowed = this.allowed()
			this.auth.session()
			untracked(() => {
				this.generation++
				this.clientPickerOpen.set(false)
				this.searchCancelled.next()
				this.client.set(null)
				this.projects.set([])
				this.total.set(0)
				this.selected.set(null)
				this.choices.set([])
				this.dirty.set(false)
				this.tab.set('Datos generales')
				this.page.set(1)
				this.error.set('')
				this.loading.set(false)
				if (allowed && id) void this.load(Number(id), projectId ? Number(projectId) : undefined)
			})
		})
	}
	async load(id = Number(this.params()?.get('prospectoId')), projectId?: number) {
		if (!this.allowed()) return
		const version = ++this.generation
		this.loading.set(true)
		this.error.set('')
		try {
			if (!Number.isInteger(id) || id < 1) throw new Error('El identificador no es válido.')
			const c = await firstValueFrom(this.prospectos.detail(id))
			if (version !== this.generation) return
			this.client.set(c)
			this.dimension = c.cantidadDimension
			await this.loadProjects(version)
			if (projectId) {
				let found = this.projects().find((p) => p.idOportunidad === projectId)
				if (!found) {
					const all = await firstValueFrom(this.api.proyectos(c.clienteId, 1, Math.max(this.total(), this.size())))
					if (version !== this.generation) return
					found = all.proyectos.find((p) => p.idOportunidad === projectId)
				}
				if (!found) throw new Error('La oportunidad no pertenece al cliente seleccionado.')
				this.selected.set(found)
				this.tab.set(this.enabled() ? 'Productos' : 'Datos generales')
			}
		} catch (e) {
			if (version === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el cliente.')
		} finally {
			if (version === this.generation) this.loading.set(false)
		}
	}
	async loadProjects(version = this.generation) {
		const c = this.client()
		if (!c || !this.allowed()) return
		const request = ++this.projectGeneration
		try {
			const r = await firstValueFrom(this.api.proyectos(c.clienteId, this.page(), this.size()))
			if (version !== this.generation || request !== this.projectGeneration) return
			this.projects.set(r.proyectos)
			this.total.set(r.totalRows)
		} catch (e) {
			if (version === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos.')
		}
	}
	async searchClients() {
		this.searchCancelled.next()
		if (!this.allowed()) return
		const version = ++this.searchGeneration,
			scope = this.generation
		this.error.set('')
		try {
			const r = await firstValueFrom(this.api.clientes(this.search.trim()).pipe(takeUntil(this.searchCancelled), takeUntilDestroyed(this.destroyRef)), { defaultValue: [] })
			if (version === this.searchGeneration && scope === this.generation && this.allowed()) this.choices.set(r)
		} catch (e) {
			if (scope === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudo buscar.')
		}
	}
	async choose(c: ClienteBusqueda) {
		if (await this.confirmNavigation()) await this.router.navigate(['/oportunidades-proyectos/oportunidades', c.prospectoId || c.id])
	}
	async saveDimension() {
		if (this.saving() || !this.allowed() || !this.client()) return
		this.saving.set(true)
		this.error.set('')
		const scope = this.generation
		try {
			if (!Number.isFinite(this.dimension) || this.dimension <= 0) throw new Error('La dimensión debe ser mayor que cero.')
			if (!(await firstValueFrom(this.api.dimension(this.client()!.clienteId, this.dimension)))) throw new Error('No se pudo guardar la dimensión.')
			if (scope === this.generation) {
				this.client.update((c) => (c ? { ...c, cantidadDimension: this.dimension } : c))
				this.notice.set('Dimensión actualizada.')
			}
		} catch (e) {
			if (scope === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudo guardar.')
		} finally {
			this.saving.set(false)
		}
	}
	async changeTab(tab: string) {
		if (tab !== 'Datos generales' && !this.enabled()) return
		if (tab === 'Productos' && !this.selected()) return
		if (await this.confirmNavigation()) this.tab.set(tab)
	}
	async edit(p: Proyecto) {
		if (await this.confirmNavigation()) {
			this.selected.set(p)
			this.tab.set('Productos')
		}
	}
	async created(event: { ids: number[]; continueProducts: boolean }) {
		this.dirty.set(false)
		this.page.set(1)
		await this.loadProjects()
		this.notice.set('Proyectos creados.')
		if (event.continueProducts) {
			await this.load(Number(this.params()?.get('prospectoId')), event.ids[0])
		} else this.tab.set('Proyectos')
	}
	async productsSaved() {
		this.dirty.set(false)
		await this.loadProjects()
		this.tab.set('Proyectos')
		this.notice.set('Productos actualizados.')
	}
	confirmNavigation(): boolean | Promise<boolean> {
		if (!this.dirty()) return true
		this.leave.set(true)
		return new Promise((resolve) => (this.resolveLeave = resolve))
	}
	discard(value: boolean) {
		this.leave.set(false)
		if (value) this.dirty.set(false)
		this.resolveLeave?.(value)
		this.resolveLeave = null
	}
}
