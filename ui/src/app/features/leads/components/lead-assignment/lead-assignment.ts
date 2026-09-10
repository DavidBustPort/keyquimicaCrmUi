import { Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { FormControl } from '@angular/forms'
import { Lead } from '@features/leads/models/lead'
import { LeadsMockStore } from '@features/leads/data-access/leads-mock.store'
import { SUCURSALES, REPRESENTANTES } from '@features/leads/data-access/leads.catalogos'
import { SelectField } from '@shared/ui/select-field/select-field'
@Component({
    selector: 'app-lead-assignment',
    imports: [SelectField],
    templateUrl: './lead-assignment.html',
})
export class LeadAssignment {
    readonly lead = input.required<Lead>()
    readonly mode = input.required<'sucursal' | 'representante'>()
    readonly saved = output<void>()
    readonly cancelled = output<void>()
    readonly store = inject(LeadsMockStore)
    readonly selection = new FormControl('', { nonNullable: true })
    readonly error = signal('')
    readonly options = computed(() =>
        this.mode() === 'sucursal'
            ? SUCURSALES
            : REPRESENTANTES.filter((r) => r.sucursalId === this.lead().sucursalId),
    )
    constructor() {
        effect(() => {
            this.selection.setValue(
                this.mode() === 'sucursal' ? this.lead().sucursalId : this.lead().representanteId,
            )
            this.error.set('')
        })
    }
    save() {
        this.error.set('')
        try {
            if (this.mode() === 'sucursal')
                this.store.changeBranch(this.lead().id, this.selection.value)
            else this.store.assign(this.lead().id, this.selection.value)
            this.saved.emit()
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
}
