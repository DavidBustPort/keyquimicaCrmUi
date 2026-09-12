import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DestroyRef } from '@angular/core'
import { Subject, takeUntil } from 'rxjs'
import { Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CurrencyPipe } from '@angular/common'
import { firstValueFrom } from 'rxjs'
import { OportunidadesApiService } from '../../data-access/oportunidades-api.service'
import { PrecioValidacion, Producto, ProductoBusqueda, ProductoRequest, Proyecto } from '../../models/oportunidad'
import { downloadCsv } from '@shared/utils/csv'
@Component({ selector: 'app-productos-editor', imports: [FormsModule, CurrencyPipe], templateUrl: './productos-editor.html' })
export class ProductosEditor {
	readonly project = input.required<Proyecto>()
	readonly segmentId = input.required<number>()
	readonly saved = output<void>()
	readonly dirty = output<boolean>()
	private readonly searchCancelled = new Subject<void>()
	private readonly destroyRef = inject(DestroyRef)
	readonly api = inject(OportunidadesApiService)
	readonly products = signal<Producto[]>([])
	readonly catalog = signal<ProductoBusqueda[]>([])
	readonly validation = signal<(PrecioValidacion & { motivo: number; justificacion: string; vigencia: string })[]>([])
	readonly error = signal('')
	readonly notice = signal('')
	readonly saving = signal(false)
	readonly searching = signal(false)
	readonly editable = computed(() => this.project().etapa < 4 && !this.project().productos.some((p) => p.estatusAutorizacion))
	readonly total = computed(() => this.products().reduce((s, p) => s + p.unidades * p.precioVenta, 0))
	search = ''
	private version = 0
	private searchVersion = 0
	constructor() {
		effect(() => {
			const p = this.project()
			this.version++
			this.searchCancelled.next()
			this.products.set(p.productos.map((x) => ({ ...x })))
			this.validation.set([])
			this.catalog.set([])
			this.error.set('')
			this.dirty.emit(false)
		})
	}
	async searchProducts() {
		this.searchCancelled.next()
		const v = ++this.searchVersion,
			scope = this.version
		this.searching.set(true)
		this.error.set('')
		try {
			const r = await firstValueFrom(this.api.productos(this.search.trim(), this.segmentId()).pipe(takeUntil(this.searchCancelled), takeUntilDestroyed(this.destroyRef)), { defaultValue: [] })
			if (v === this.searchVersion && scope === this.version) this.catalog.set(r)
		} catch (e) {
			if (scope === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo buscar.')
		} finally {
			if (v === this.searchVersion) this.searching.set(false)
		}
	}
	add(p: ProductoBusqueda) {
		if (!this.editable() || this.products().some((x) => x.sku === p.id)) return
		this.products.update((rows) => [...rows, { sku: p.id, descripcion: p.name, unidades: 1, precioLista: p.precioLista, precioObjetivo: p.precioObjetivo, precioVenta: p.precioLista, monto: p.precioLista, estatusAutorizacion: false }])
		this.dirty.emit(true)
	}
	remove(sku: number) {
		if (!this.editable()) return
		this.products.update((p) => p.filter((x) => x.sku !== sku))
		this.dirty.emit(true)
	}
	changed() {
		this.products.set([...this.products()])
		this.validation.set([])
		this.dirty.emit(true)
	}
	private request(): ProductoRequest[] {
		const current = this.products().map((p) => ({ sku: p.sku, cantidad: p.unidades, precioVentaSugerido: p.precioVenta, deleteProducto: false }))
		return [
			...current,
			...this.project()
				.productos.filter((p) => !current.some((x) => x.sku === p.sku))
				.map((p) => ({ sku: p.sku, cantidad: p.unidades, precioVentaSugerido: p.precioVenta, deleteProducto: true }))
		]
	}
	async save() {
		if (this.saving() || !this.editable()) return
		this.error.set('')
		this.validation.set([])
		if (this.products().some((p) => !Number.isInteger(p.unidades) || p.unidades <= 0 || !Number.isFinite(p.precioVenta) || p.precioVenta <= 0)) {
			this.error.set('Las cantidades deben ser enteros positivos y los precios mayores que cero.')
			return
		}
		const scope = this.version
		this.saving.set(true)
		try {
			const r = await firstValueFrom(this.api.save(this.project().idOportunidad, this.request()))
			if (scope !== this.version) return
			if (r.estatus) {
				this.dirty.emit(false)
				this.saved.emit()
			} else {
				this.validation.set(r.proyectos.flatMap((p) => p.productos).map((p) => ({ ...p, motivo: 0, justificacion: '', vigencia: p.fechaVigencia.slice(0, 10) })))
				this.error.set(
					r.proyectos
						.map((p) => p.mensaje)
						.filter(Boolean)
						.join(' ') || 'Hay precios que requieren autorización. Los productos válidos ya se guardaron.'
				)
			}
		} catch (e) {
			if (scope === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo guardar.')
		} finally {
			this.saving.set(false)
		}
	}
	async authorize() {
		if (this.saving() || !this.validation().length) return
		if (this.validation().some((p) => !p.motivo || !p.justificacion.trim() || !p.vigencia)) {
			this.error.set('Completa motivo, justificación y vigencia para cada producto.')
			return
		}
		const scope = this.version
		this.saving.set(true)
		this.error.set('')
		try {
			const ok = await firstValueFrom(
				this.api.requestPrices(
					this.project().idOportunidad,
					this.validation().map((p) => ({ sku: p.id, cantidad: p.cantidad, precioVentaSugerido: p.precioVentaIngresado, deleteProducto: false, motivo: p.motivo, justificacion: p.justificacion.trim(), fechaVigencia: p.vigencia }))
				)
			)
			if (!ok) throw new Error('No se pudo registrar la solicitud.')
			if (scope === this.version) {
				this.dirty.emit(false)
				this.saved.emit()
			}
		} catch (e) {
			if (scope === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo solicitar autorización.')
		} finally {
			this.saving.set(false)
		}
	}
	template() {
		downloadCsv('plantilla-productos.csv', [['SKU', 'Cantidad', 'PrecioVenta']])
	}
	async excelTemplate() {
		this.error.set('')
		try {
			const blob = await firstValueFrom(this.api.template())
			const url = URL.createObjectURL(blob),
				a = document.createElement('a')
			a.href = url
			a.download = 'productos.xlsx'
			a.click()
			setTimeout(() => URL.revokeObjectURL(url), 1000)
		} catch {
			this.error.set('No se pudo descargar la plantilla.')
		}
	}
	async importExcel(event: Event) {
		const input = event.target as HTMLInputElement,
			file = input.files?.[0]
		if (!file || !this.editable() || this.saving()) return
		const scope = this.version
		this.saving.set(true)
		this.error.set('')
		try {
			const products = await firstValueFrom(this.api.importProducts(file, this.segmentId()))
			if (scope !== this.version) return
			if (products.some((p) => this.products().some((x) => x.sku === p.sku))) throw new Error('El archivo contiene productos que ya están en el proyecto.')
			this.products.update((p) => [...p, ...products])
			this.dirty.emit(true)
		} catch (e) {
			if (scope === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo importar Excel.')
		} finally {
			this.saving.set(false)
			input.value = ''
		}
	}
	async importFile(event: Event) {
		const input = event.target as HTMLInputElement,
			file = input.files?.[0]
		if (!file || !this.editable()) return
		this.error.set('')
		const scope = this.version
		this.saving.set(true)
		try {
			if (file.size > 1024 * 1024) throw new Error('El archivo debe ser menor a 1 MB.')
			const text = await file.text()
			const lines = text
				.replace(/^\uFEFF/, '')
				.trim()
				.split(/\r?\n/)
			const sep = lines[0].includes(';') ? ';' : ','
			if (
				lines[0]
					.toLowerCase()
					.split(sep)
					.map((x) => x.trim())
					.join(',') !== 'sku,cantidad,precioventa'
			)
				throw new Error('Usa la plantilla con SKU, Cantidad y PrecioVenta.')
			const staged: Producto[] = []
			for (const line of lines.slice(1)) {
				if (!line.trim()) continue
				const [sku, qty, price] = line.split(sep).map(Number)
				if (!Number.isInteger(sku) || sku <= 0 || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) throw new Error('El archivo contiene valores inválidos.')
				if (this.products().some((p) => p.sku === sku) || staged.some((p) => p.sku === sku)) throw new Error('SKU duplicado: ' + sku)
				const rows = await firstValueFrom(this.api.productos('', this.segmentId(), sku))
				const p = rows.find((p) => p.id === sku)
				if (!p) throw new Error('SKU no encontrado: ' + sku)
				staged.push({ sku, descripcion: p.name, unidades: qty, precioLista: p.precioLista, precioObjetivo: p.precioObjetivo, precioVenta: price, monto: qty * price, estatusAutorizacion: false })
			}
			if (scope === this.version) {
				this.products.update((p) => [...p, ...staged])
				this.dirty.emit(true)
			}
		} catch (e) {
			if (scope === this.version) this.error.set(e instanceof Error ? e.message : 'No se pudo importar.')
		} finally {
			this.saving.set(false)
			input.value = ''
		}
	}
}
