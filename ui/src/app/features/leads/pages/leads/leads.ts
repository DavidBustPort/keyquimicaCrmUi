import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { toSignal } from '@angular/core/rxjs-interop'
import { tap } from 'rxjs'
import { LeadsMockStore } from '@features/leads/data-access/leads-mock.store'
import { ESTADOS, SUCURSALES } from '@features/leads/data-access/leads.catalogos'
import { LeadView } from '@features/leads/models/lead'
import { LeadsTable } from '@features/leads/components/leads-table/leads-table'
import { LeadDetail } from '@features/leads/components/lead-detail/lead-detail'
import { Pagination } from '@shared/ui/pagination/pagination'
import { SelectField } from '@shared/ui/select-field/select-field'
import { Modal } from '@shared/ui/modal/modal'
@Component({
    host: { class: 'block' },
    selector: 'app-leads',
    imports: [ReactiveFormsModule, LeadsTable, LeadDetail, Pagination, SelectField, Modal],
    templateUrl: './leads.html',
})
export class Leads {
    readonly store = inject(LeadsMockStore)
    readonly filters = inject(FormBuilder).nonNullable.group({
        search: [''],
        estado: [''],
        sucursal: [''],
    })
    readonly values = toSignal(
        this.filters.valueChanges.pipe(
            tap(() => {
                this.page.set(1)
                this.selectedId.set(null)
            }),
        ),
        { initialValue: this.filters.getRawValue() },
    )
    readonly page = signal(1)
    readonly size = signal(10)
    readonly selectedId = signal<number | null>(null)
    readonly statuses = ESTADOS
    readonly branches = SUCURSALES
    readonly visible = computed(() =>
        this.store
            .leads()
            .filter(
                (lead) =>
                    this.store.view() === 'gerente' ||
                    lead.representanteId === this.store.representanteActual,
            ),
    )
    readonly filtered = computed(() => {
        const f = this.values()
        return this.visible().filter(
            (lead) =>
                (!f.search ||
                    [
                        lead.id,
                        lead.empresa,
                        lead.contacto,
                        lead.producto,
                        lead.correo,
                        lead.segmento,
                    ]
                        .join(' ')
                        .toLocaleLowerCase()
                        .includes(f.search.trim().toLocaleLowerCase())) &&
                (!f.estado || lead.estado === f.estado) &&
                (!f.sucursal || lead.sucursalId === f.sucursal),
        )
    })
    readonly currentPage = computed(() =>
        Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.size()))),
    )
    readonly rows = computed(() =>
        this.filtered().slice(
            (this.currentPage() - 1) * this.size(),
            this.currentPage() * this.size(),
        ),
    )
    readonly selected = computed(
        () => this.visible().find((lead) => lead.id === this.selectedId()) ?? null,
    )
    readonly summaries = computed(() =>
        ESTADOS.map((status) => ({
            ...status,
            count: this.visible().filter((lead) => lead.estado === status.value).length,
        })),
    )
    setView(view: LeadView) {
        this.selectedId.set(null)
        this.store.view.set(view)
        this.filters.reset()
        this.page.set(1)
        this.store.notice.set('')
    }
}
