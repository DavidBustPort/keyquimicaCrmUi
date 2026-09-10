import { Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { FormControl } from '@angular/forms'
import { Lead } from '@features/leads/models/lead'
import { LeadsService } from '@features/leads/data-access/leads.service'
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
    readonly store = inject(LeadsService)
    readonly loading = signal(false)
    readonly selection = new FormControl('', { nonNullable: true })
    readonly error = signal('')
    readonly options = computed(() =>
        this.mode() === 'sucursal'
            ? this.store.branches().map((r) => ({ value: String(r.id), label: r.name }))
            : this.store.reps().map((r) => ({ value: String(r.id), label: `${r.id} - ${r.name}` })),
    )
    constructor() {
        effect(() => {
            this.selection.setValue(
                this.mode() === 'sucursal' ? this.lead().sucursalId : this.lead().representanteId,
            )
            this.error.set('')
            void this.loadOptions()
        })
    }
    async loadOptions() {
        this.loading.set(true)
        try {
            await this.store.loadCatalog(this.mode())
        } catch (e) {
            this.error.set((e as Error).message)
        } finally {
            this.loading.set(false)
        }
    }
    async save() {
        if (this.loading() || this.store.saving()) return
        this.error.set('')
        try {
            if (this.mode() === 'sucursal')
                await this.store.changeBranch(this.lead().id, this.selection.value)
            else await this.store.assign(this.lead().id, this.selection.value)
            this.saved.emit()
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
}
