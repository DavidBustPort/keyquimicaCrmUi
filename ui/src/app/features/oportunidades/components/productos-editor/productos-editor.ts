import {
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { toSignal } from '@angular/core/rxjs-interop'
import {
    OportunidadesMockStore,
    esEditable,
} from '@features/oportunidades/data-access/oportunidades-mock.store'
import {
    PRODUCTOS,
    MOTIVOS_PRECIO,
} from '@features/oportunidades/data-access/oportunidades.catalogos'
import { ProductoProyecto } from '@features/oportunidades/models/oportunidad'
import { Modal } from '@shared/ui/modal/modal'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
import { downloadCsv } from '@shared/utils/csv'
@Component({
    selector: 'app-productos-editor',
    imports: [CurrencyPipe, ReactiveFormsModule, Modal, EmptyState],
    templateUrl: './productos-editor.html',
})
export class ProductosEditor {
    readonly projectId = input.required<number>()
    readonly saved = output<void>()
    readonly dirty = output<boolean>()
    readonly store = inject(OportunidadesMockStore)
    readonly products = signal<ProductoProyecto[]>([])
    readonly search = new FormControl('', { nonNullable: true })
    readonly query = toSignal(this.search.valueChanges, { initialValue: '' })
    readonly modal = signal(false)
    readonly error = signal('')
    readonly authorization = signal(false)
    readonly reasons = MOTIVOS_PRECIO
    readonly catalog = computed(() =>
        PRODUCTOS.filter((p) =>
            [p.sku, p.nombre].join(' ').toLowerCase().includes(this.query().trim().toLowerCase()),
        ),
    )
    readonly total = computed(() =>
        this.products().reduce((sum, p) => sum + p.cantidad * p.precioVenta, 0),
    )
    readonly belowMinimum = computed(() =>
        this.products().filter((p) => p.precioVenta < p.precioMinimo),
    )
    constructor() {
        effect(() => {
            const id = this.projectId()
            const p = untracked(() => this.store.proyectos().find((p) => p.id === id))
            this.products.set(p ? p.productos.map((x) => ({ ...x })) : [])
            this.error.set('')
            this.authorization.set(false)
            this.dirty.emit(false)
        })
    }
    get editable() {
        const p = this.store.proyectos().find((p) => p.id === this.projectId())
        return !!p && esEditable(p)
    }
    hasProduct(sku: string) {
        return this.products().some((product) => product.sku === sku)
    }
    add(sku: string) {
        if (!this.editable || this.products().some((p) => p.sku === sku)) return
        const product = PRODUCTOS.find((p) => p.sku === sku)
        if (product) {
            this.products.update((rows) => [
                ...rows,
                { ...product, cantidad: 1, precioVenta: product.precioLista, pendiente: false },
            ])
            this.dirty.emit(true)
        }
    }
    update(
        sku: string,
        field: 'cantidad' | 'precioVenta' | 'motivo' | 'justificacion' | 'vigencia',
        value: string,
    ) {
        if (!this.editable) return
        this.products.update((rows) =>
            rows.map((p) =>
                p.sku === sku
                    ? {
                          ...p,
                          [field]:
                              field === 'cantidad' || field === 'precioVenta'
                                  ? Number(value)
                                  : value,
                      }
                    : p,
            ),
        )
        this.dirty.emit(true)
    }
    remove(sku: string) {
        if (!this.editable) return
        this.products.update((rows) => rows.filter((p) => p.sku !== sku))
        this.dirty.emit(true)
    }
    save() {
        this.error.set('')
        if (
            this.products().some(
                (p) =>
                    !Number.isFinite(p.cantidad) ||
                    p.cantidad <= 0 ||
                    !Number.isFinite(p.precioVenta) ||
                    p.precioVenta <= 0,
            )
        ) {
            this.error.set('Cantidad y precio de venta deben ser mayores que cero.')
            return
        }
        if (this.belowMinimum().length) {
            this.authorization.set(true)
            return
        }
        this.commit()
    }
    commit() {
        try {
            this.store.saveProducts(this.projectId(), this.products())
            this.authorization.set(false)
            this.dirty.emit(false)
            this.saved.emit()
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
    template() {
        downloadCsv('plantilla-productos.csv', [
            ['SKU', 'Cantidad', 'PrecioVenta'],
            ['KEY-101', 10, 420],
            ['KEY-102', 5, 580],
        ])
    }
    async importFile(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) return
        try {
            if (file.size > 1024 * 1024) throw new Error('El archivo debe ser menor a 1 MB.')
            this.importText(await file.text())
        } catch (e) {
            this.error.set((e as Error).message)
        } finally {
            input.value = ''
        }
    }
    importText(text: string) {
        if (!this.editable) return
        this.error.set('')
        const lines = text
            .replace(/^\uFEFF/, '')
            .trim()
            .split(/\r?\n/)
        const separator = lines[0]?.includes(';') ? ';' : ','
        const cells = (line: string) =>
            line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''))
        const headers = cells(lines[0] ?? '').map((value) => value.toLowerCase())
        if (headers.join(',') !== 'sku,cantidad,precioventa' || lines.length < 2)
            throw new Error('Usa la plantilla CSV con SKU, Cantidad y PrecioVenta.')
        const staged: ProductoProyecto[] = []
        for (const [index, line] of lines.slice(1).entries()) {
            if (!line.trim()) continue
            const [sku, quantity, price] = cells(line)
            const p = PRODUCTOS.find((p) => p.sku === sku)
            if (!p) throw new Error('Fila ' + (index + 2) + ': SKU no encontrado.')
            if (this.products().some((p) => p.sku === sku) || staged.some((p) => p.sku === sku))
                throw new Error('Fila ' + (index + 2) + ': SKU duplicado.')
            const cantidad = Number(quantity)
            const precioVenta = Number(price)
            if (
                !Number.isFinite(cantidad) ||
                cantidad <= 0 ||
                !Number.isFinite(precioVenta) ||
                precioVenta <= 0
            )
                throw new Error('Fila ' + (index + 2) + ': cantidad y precio inválidos.')
            staged.push({ ...p, cantidad, precioVenta, pendiente: false })
        }
        if (!staged.length) throw new Error('El archivo no contiene productos.')
        this.products.update((rows) => [...rows, ...staged])
        this.dirty.emit(true)
    }
}
