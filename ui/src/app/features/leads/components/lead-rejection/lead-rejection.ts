import { Component, inject, input, output, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { LeadsMockStore } from '@features/leads/data-access/leads-mock.store'
import { MOTIVOS_RECHAZO } from '@features/leads/data-access/leads.catalogos'
import { SelectField } from '@shared/ui/select-field/select-field'
@Component({
    selector: 'app-lead-rejection',
    imports: [ReactiveFormsModule, SelectField],
    templateUrl: './lead-rejection.html',
})
export class LeadRejection {
    readonly leadId = input.required<number>()
    readonly saved = output<void>()
    readonly cancelled = output<void>()
    readonly store = inject(LeadsMockStore)
    readonly reasons = MOTIVOS_RECHAZO
    readonly reason = new FormControl('', { nonNullable: true })
    readonly explanation = new FormControl('', { nonNullable: true })
    readonly error = signal('')
    save() {
        this.error.set('')
        const reason = this.reasons.find((r) => r.value === this.reason.value)
        if (!reason) {
            this.error.set('Selecciona un motivo de rechazo.')
            return
        }
        const detail = reason.value === 'otro' ? this.explanation.value.trim() : reason.label
        if (!detail) {
            this.error.set('Especifica el motivo de rechazo.')
            return
        }
        try {
            this.store.reject(this.leadId(), detail)
            this.saved.emit()
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
}
