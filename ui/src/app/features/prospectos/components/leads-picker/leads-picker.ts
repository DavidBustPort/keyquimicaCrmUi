import { Component, computed, inject, output, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { toSignal } from '@angular/core/rxjs-interop'
import { ProspectosMockStore } from '@features/prospectos/data-access/prospectos-mock.store'
import { Lead } from '@features/leads/models/lead'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
import { Pagination } from '@shared/ui/pagination/pagination'
@Component({
    selector: 'app-leads-picker',
    imports: [ReactiveFormsModule, EmptyState, Pagination],
    templateUrl: './leads-picker.html',
})
export class LeadsPicker {
    readonly store = inject(ProspectosMockStore)
    readonly selected = output<Lead>()
    readonly search = new FormControl('', { nonNullable: true })
    readonly query = toSignal(this.search.valueChanges, { initialValue: '' })
    readonly page = signal(1)
    readonly size = signal(5)
    readonly expanded = signal<number | null>(null)
    readonly rejecting = signal<number | null>(null)
    readonly reason = new FormControl('', { nonNullable: true })
    readonly comment = new FormControl('', { nonNullable: true })
    readonly rejected = signal('')
    readonly error = signal('')
    readonly filtered = computed(() =>
        this.store
            .leads()
            .filter(
                (l) =>
                    this.store.leadsStore.canDevelop(l.id) &&
                    [l.empresa, l.contacto, l.producto, l.segmento]
                        .join(' ')
                        .toLocaleLowerCase()
                        .includes(this.query().trim().toLocaleLowerCase()),
            ),
    )
    readonly rows = computed(() =>
        this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()),
    )
    beginReject(id: number) {
        this.rejecting.set(id)
        this.reason.setValue('')
        this.comment.setValue('')
        this.error.set('')
    }
    reject() {
        const reason = this.reason.value === 'Otro' ? this.comment.value.trim() : this.reason.value
        if (!reason) {
            this.error.set('Selecciona un motivo y completa el comentario si eliges Otro.')
            return
        }
        try {
            this.store.rejectLead(this.rejecting()!, reason)
        } catch (error) {
            this.error.set((error as Error).message)
            return
        }
        this.rejecting.set(null)
        this.page.set(1)
        this.rejected.set('Lead rechazado.')
    }
}
