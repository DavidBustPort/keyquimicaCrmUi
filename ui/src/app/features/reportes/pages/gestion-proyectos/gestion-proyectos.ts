import { CurrencyPipe } from '@angular/common'
import { Component, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MultiSelect } from '@shared/ui/multi-select/multi-select'
import {
    BRANCHES,
    CATALOGS,
    GROUPS,
    REPS,
    SEGMENTS,
    defaults,
    filterRows,
    label,
    mockRows,
    validPeriod,
} from '@features/reportes/data-access/reportes-mock'
import { downloadReport } from '@features/reportes/data-access/report-export'
import { ReportFilters, ReportOption } from '@features/reportes/models/reporte'
@Component({
    host: { class: 'block' },
    selector: 'app-gestion-proyectos',
    imports: [FormsModule, CurrencyPipe, MultiSelect],
    templateUrl: './gestion-proyectos.html',
})
export class GestionProyectos {
    readonly filters = signal(defaults())
    readonly error = signal('')
    readonly status = signal('')
    readonly busy = signal(false)
    readonly groups = GROUPS
    readonly catalogs = CATALOGS
    readonly label = label
    private readonly records = mockRows()
    readonly branches = computed(() => BRANCHES.filter((b) => b.group === this.filters().group))
    readonly representatives = computed(() =>
        REPS.filter((r) =>
            (this.filters().view === 'central' ? this.filters().branches : ['1']).includes(
                r.branch,
            ),
        ),
    )
    readonly segments = computed(() => SEGMENTS.filter((s) => s.uen === this.filters().uen))
    readonly rows = computed(() => filterRows(this.records, this.filters()))
    readonly total = computed(() => this.rows().reduce((sum, r) => sum + r.amount, 0))
    readonly dirty = computed(() => JSON.stringify(this.filters()) !== JSON.stringify(defaults()))
    readonly fields: {
        key: 'clientType' | 'stage' | 'category' | 'uen' | 'segment' | 'saleType' | 'supplier'
        title: string
    }[] = [
        { key: 'clientType', title: 'Tipo de cliente / prospecto' },
        { key: 'stage', title: 'Etapa de oportunidad' },
        { key: 'category', title: 'Categoría de productos' },
        { key: 'uen', title: 'UEN' },
        { key: 'segment', title: 'Segmento' },
        { key: 'saleType', title: 'Tipo de venta' },
        { key: 'supplier', title: 'Proveedor de productos' },
    ]
    options(key: (typeof this.fields)[number]['key']): ReportOption[] {
        return key === 'segment' ? this.segments() : CATALOGS[key]
    }
    set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
        this.filters.update((f) => ({ ...f, [key]: value }))
        if (key === 'group')
            this.filters.update((f) => ({
                ...f,
                branches: this.branches().map((b) => b.value),
                representative: '',
            }))
        if (key === 'branches') this.filters.update((f) => ({ ...f, representative: '' }))
        if (key === 'uen') this.filters.update((f) => ({ ...f, segment: '' }))
        if (key === 'view')
            this.filters.update((f) => ({ ...f, representative: '', supplier: '', mode: 'all' }))
        this.error.set('')
        this.status.set('')
    }
    reset() {
        this.filters.set(defaults())
        this.error.set('')
        this.status.set('')
    }
    export() {
        if (this.busy()) return
        this.status.set('')
        if (!validPeriod(this.filters())) {
            this.error.set(
                'Selecciona un periodo válido: el inicio debe ser anterior o igual al final.',
            )
            return
        }
        if (!this.rows().length) {
            this.error.set(
                'No se encontraron registros con los filtros seleccionados. Ajusta los filtros e intenta de nuevo.',
            )
            return
        }
        this.busy.set(true)
        this.error.set('')
        try {
            const f = this.filters()
            downloadReport(this.rows(), f.mode, f.start, f.end)
            this.status.set(
                'Archivo generado con ' + this.rows().length + ' oportunidades de demostración.',
            )
        } catch {
            this.error.set('No se pudo generar el archivo. Intenta descargarlo nuevamente.')
        } finally {
            this.busy.set(false)
        }
    }
}
