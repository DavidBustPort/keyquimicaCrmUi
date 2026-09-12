import { Component, effect, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CurrencyPipe } from '@angular/common'
import { firstValueFrom } from 'rxjs'
import { ProspectoDetail } from '@features/prospectos/models/prospecto'
import { Catalogo } from '../../models/oportunidad'
import { OportunidadesApiService } from '../../data-access/oportunidades-api.service'
@Component({ selector: 'app-proyecto-form', imports: [FormsModule, CurrencyPipe], templateUrl: './proyecto-form.html' })
export class ProyectoForm {
	readonly client = input.required<ProspectoDetail>()
	readonly saved = output<{ ids: number[]; continueProducts: boolean }>()
	readonly dirty = output<boolean>()
	readonly api = inject(OportunidadesApiService)
	readonly areas = signal<Catalogo[]>([])
	readonly solutions = signal<Catalogo[]>([])
	readonly apps = signal<(Catalogo & { selected: boolean; vpo: number })[]>([])
	readonly error = signal('')
	readonly loading = signal(false)
	readonly saving = signal(false)
	area = 0
	solution = 0
	tipoVenta = 1
	private version = 0
	constructor() {
		effect(() => {
			const c = this.client()
			void this.load(c)
		})
	}
	async load(c = this.client()) {
		const v = ++this.version
		this.loading.set(true)
		this.error.set('')
		try {
			const r = await firstValueFrom(this.api.catalogo('areas', c.segmentoId ?? 0))
			if (v === this.version) this.areas.set(r)
		} catch (e) {
			if (v === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo cargar áreas.')
		} finally {
			if (v === this.version) this.loading.set(false)
		}
	}
	async changeArea() {
		this.dirty.emit(true)
		const v = ++this.version
		this.solution = 0
		this.solutions.set([])
		this.apps.set([])
		if (!this.area) return
		this.loading.set(true)
		this.error.set('')
		try {
			const r = await firstValueFrom(this.api.catalogo('soluciones', this.area))
			if (v === this.version) this.solutions.set(r)
		} catch (e) {
			if (v === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo cargar soluciones.')
		} finally {
			if (v === this.version) this.loading.set(false)
		}
	}
	async changeSolution() {
		this.dirty.emit(true)
		const v = ++this.version
		this.apps.set([])
		if (!this.solution) return
		this.loading.set(true)
		this.error.set('')
		try {
			const r = await firstValueFrom(this.api.catalogo('aplicaciones', this.solution, this.client().clienteId))
			if (v === this.version) this.apps.set(r.map((a) => ({ ...a, selected: false, vpo: 0 })))
		} catch (e) {
			if (v === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo cargar aplicaciones.')
		} finally {
			if (v === this.version) this.loading.set(false)
		}
	}
	vpt(a: Catalogo) {
		return (this.client().cantidadDimension * (this.client().segmentoValorDimension ?? 0) * a.potencial) / 100
	}
	async save(continueProducts: boolean) {
		if (this.saving() || this.loading()) return
		this.error.set('')
		const apps = this.apps().filter((a) => a.selected && a.activo)
		if (!this.area || !this.solution || !apps.length || apps.some((a) => !Number.isFinite(a.vpo) || a.vpo <= 0)) {
			this.error.set('Selecciona área, solución y aplicaciones con VPO mayor que cero.')
			return
		}
		const c = this.client(),
			v = this.version
		this.saving.set(true)
		try {
			const r = await firstValueFrom(
				this.api.add({
					idCliente: c.clienteId,
					idProspecto: c.prospectoId,
					idTerritorio: c.territorioId ?? 0,
					idArea: this.area,
					idSolucion: this.solution,
					tipoVenta: this.tipoVenta,
					aplicaciones: apps.map((a) => ({ idAplicacion: a.id, vpo: a.vpo }))
				})
			)
			if (v === this.version) {
				this.dirty.emit(false)
				this.saved.emit({ ids: r.map((p) => p.idOportunidad), continueProducts })
			}
		} catch (e) {
			if (v === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo guardar.')
		} finally {
			this.saving.set(false)
		}
	}
}
