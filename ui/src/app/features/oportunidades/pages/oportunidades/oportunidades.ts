import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { OportunidadesMockStore, montoProyecto } from '@features/oportunidades/data-access/oportunidades-mock.store'
import { APLICACIONES, catalogName } from '@features/oportunidades/data-access/oportunidades.catalogos'
import { UENS, SEGMENTOS, TIPOS_CLIENTE, TERRITORIOS } from '@features/oportunidades/data-access/prospectos-mock.store'
import { Oportunidad } from '@features/oportunidades/models/oportunidad'
import { ProyectoForm } from '@features/oportunidades/components/proyecto-form/proyecto-form'
import { ProductosEditor } from '@features/oportunidades/components/productos-editor/productos-editor'
import { ProyectosTable } from '@features/oportunidades/components/proyectos-table/proyectos-table'
import { SearchPicker } from '@shared/ui/search-picker/search-picker'
import { Pagination } from '@shared/ui/pagination/pagination'
import { Modal } from '@shared/ui/modal/modal'
type Tab = 'Datos generales' | 'Proyectos' | 'Alta proyecto' | 'Productos'
@Component({
	selector: 'app-oportunidades',
	imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, ProyectoForm, ProductosEditor, ProyectosTable, SearchPicker, Pagination, Modal],
	templateUrl: './oportunidades.html'
})
export class Oportunidades {
	readonly store = inject(OportunidadesMockStore)
	private readonly router = inject(Router)
	private readonly params = toSignal(inject(ActivatedRoute).paramMap)
	readonly clientId = signal<number | null>(null)
	readonly selectedProjectId = signal<number | null>(null)
	readonly tab = signal<Tab>('Datos generales')
	readonly tabs: Tab[] = ['Datos generales', 'Proyectos', 'Alta proyecto', 'Productos']
	readonly changeClient = signal(false)
	readonly dimension = new FormControl(0, { nonNullable: true })
	readonly error = signal('')
	readonly routeError = signal('')
	readonly projectDirty = signal(false)
	readonly productDirty = signal(false)
	readonly pendingAction = signal<(() => void) | null>(null)
	private leaveResolve: ((result: boolean) => void) | null = null
	readonly page = signal(1)
	readonly size = signal(5)
	readonly client = computed(() => this.store.clientes().find((c) => c.id === this.clientId()) ?? null)
	readonly choices = computed(() =>
		this.store.clientes().map((c) => ({
			id: c.id,
			label: c.razonSocial,
			description: '#' + c.id + ' · ' + (c.tipoClienteId === '2' ? 'Cliente' : 'Prospecto') + ' · ' + (c.registro ? 'Registro completo' : 'Completa sus datos antes de continuar')
		}))
	)
	readonly projects = computed(() => this.store.proyectos().filter((p) => p.prospectoId === this.clientId()))
	readonly projectRows = computed(() => this.projects().slice((this.page() - 1) * this.size(), this.page() * this.size()))
	readonly selectedProject = computed(() => this.projects().find((p) => p.id === this.selectedProjectId()) ?? null)
	readonly enabled = computed(() => !!this.client()?.registro && (this.store.dimensiones()[this.clientId() ?? 0] ?? 0) > 0)
	readonly application = (id: string) => catalogName(APLICACIONES, id)
	readonly amount = montoProyecto
	readonly fields = computed(() => {
		const c = this.client()
		if (!c) return []
		return [
			{ label: 'Contacto', value: c.contacto },
			{ label: 'Correo', value: c.correo },
			{ label: 'Teléfono', value: c.telefono },
			{ label: 'UEN', value: catalogName(UENS, c.uenId) },
			{ label: 'Segmento', value: catalogName(SEGMENTOS, c.segmentoId) },
			{ label: 'Tipo de cliente', value: catalogName(TIPOS_CLIENTE, c.tipoClienteId) },
			{ label: 'Territorio', value: catalogName(TERRITORIOS, c.territorioId) },
			{ label: 'Observaciones', value: c.observaciones }
		]
	})
	constructor() {
		effect(() => {
			const params = this.params()
			untracked(() => {
				const id = params?.get('prospectoId')
				const projectId = params?.get('oportunidadId')
				this.clientId.set(id ? Number(id) : null)
				this.selectedProjectId.set(null)
				this.tab.set('Datos generales')
				this.page.set(1)
				this.error.set('')
				this.routeError.set('')
				this.projectDirty.set(false)
				this.productDirty.set(false)
				if (id && !this.client()) {
					this.routeError.set('El cliente o prospecto solicitado no existe.')
					return
				}
				if (projectId) {
					const p = this.projects().find((p) => p.id === Number(projectId))
					if (!p) {
						this.routeError.set('La oportunidad no existe o no pertenece a este prospecto.')
						return
					}
					this.selectedProjectId.set(p.id)
					this.tab.set(this.enabled() ? 'Productos' : 'Datos generales')
				}
				this.dimension.setValue(this.store.dimensiones()[Number(id)] ?? 0)
			})
		})
	}
	chooseClient(id: number) {
		this.changeClient.set(false)
		this.requestAction(() => {
			this.projectDirty.set(false)
			this.productDirty.set(false)
			void this.router.navigate(['/oportunidades-proyectos/oportunidades', id])
		})
	}
	saveDimension() {
		this.error.set('')
		try {
			this.store.saveDimension(this.clientId()!, this.dimension.value)
		} catch (e) {
			this.error.set((e as Error).message)
		}
	}
	goTab(tab: Tab) {
		if (tab !== 'Datos generales' && !this.enabled()) return
		if (tab === 'Productos' && !this.selectedProject()) return
		this.tab.set(tab)
	}
	edit(project: Oportunidad) {
		const apply = () => {
			this.productDirty.set(false)
			this.selectedProjectId.set(project.id)
			this.tab.set('Productos')
		}
		if (this.productDirty()) this.pendingAction.set(apply)
		else apply()
	}
	created(event: { projects: Oportunidad[]; continueProducts: boolean }) {
		this.projectDirty.set(false)
		this.page.set(1)
		if (event.continueProducts) this.edit(event.projects[0])
		else this.tab.set('Proyectos')
	}
	productsSaved() {
		this.productDirty.set(false)
		this.tab.set('Proyectos')
	}
	requestAction(action: () => void) {
		if (this.projectDirty() || this.productDirty()) this.pendingAction.set(action)
		else action()
	}
	confirmNavigation(): boolean | Promise<boolean> {
		if (!this.projectDirty() && !this.productDirty()) return true
		return new Promise((resolve) => {
			this.leaveResolve = resolve
			this.pendingAction.set(() => {
				this.projectDirty.set(false)
				this.productDirty.set(false)
				resolve(true)
				this.leaveResolve = null
			})
		})
	}
	confirmDiscard() {
		const action = this.pendingAction()
		this.pendingAction.set(null)
		action?.()
	}
	cancelDiscard() {
		this.pendingAction.set(null)
		this.leaveResolve?.(false)
		this.leaveResolve = null
	}
}
