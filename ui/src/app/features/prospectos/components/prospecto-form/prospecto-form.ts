import { Component, effect, inject, input, signal, untracked } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import {
    ProspectosMockStore,
    UENS,
    SEGMENTOS,
    TIPOS_CLIENTE,
    TERRITORIOS,
} from '@features/prospectos/data-access/prospectos-mock.store'
import { Lead } from '@features/leads/models/lead'
import { FormField } from '@shared/ui/form-field/form-field'
import { SelectField } from '@shared/ui/select-field/select-field'
import { CurrencyInput } from '@shared/ui/currency-input/currency-input'
import { Modal } from '@shared/ui/modal/modal'
import { LeadsPicker } from '@features/prospectos/components/leads-picker/leads-picker'
const requiredText = Validators.pattern(/\S/)
@Component({
    selector: 'app-prospecto-form',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        FormField,
        SelectField,
        CurrencyInput,
        Modal,
        LeadsPicker,
    ],
    templateUrl: './prospecto-form.html',
})
export class ProspectoForm {
    readonly prospectoId = input<number>()
    readonly leadId = input<number>()
    readonly store = inject(ProspectosMockStore)
    private readonly router = inject(Router)
    private readonly fb = inject(FormBuilder).nonNullable
    readonly modalOpen = signal(false)
    readonly selectedLead = signal<Lead | null>(null)
    readonly submitted = signal(false)
    readonly saveError = signal('')
    readonly missing = signal(false)
    readonly uens = UENS
    readonly tipos = TIPOS_CLIENTE
    readonly territorios = TERRITORIOS
    readonly form = this.fb.group({
        razonSocial: ['', [Validators.required, requiredText]],
        contacto: [''],
        correo: ['', Validators.email],
        telefono: [''],
        uenId: ['', Validators.required],
        segmentoId: ['', Validators.required],
        tipoClienteId: ['', Validators.required],
        territorioId: ['', Validators.required],
        vpo: [0, [Validators.required, Validators.min(0.01)]],
        observaciones: [''],
    })
    constructor() {
        effect(() => {
            const id = this.leadId()
            untracked(() => {
                if (id === undefined || this.prospectoId() !== undefined) return
                if (!this.store.leadsStore.canDevelop(id)) {
                    this.saveError.set(
                        'El lead solicitado no existe o ya no está disponible para este representante.',
                    )
                    return
                }
                this.selectLead(this.store.leadsStore.get(id))
            })
        })
        effect(() => {
            const id = this.prospectoId()
            if (id !== undefined) {
                const record = this.store.prospectos().find((p) => p.id === id)
                this.missing.set(!record)
                if (record) this.form.patchValue(record)
            }
        })
    }
    get segmentos() {
        return SEGMENTOS.filter((s) => s.uenId === this.form.controls.uenId.value)
    }
    error(name: keyof typeof this.form.controls) {
        const c = this.form.controls[name]
        if (!c.invalid || (!this.submitted() && !c.touched)) return ''
        if (c.hasError('email')) return 'Ingresa un correo electrónico válido.'
        if (c.hasError('min')) return 'El VPO debe ser mayor que cero.'
        return 'Este campo es requerido.'
    }
    selectLead(lead: Lead) {
        this.selectedLead.set(lead)
        this.form.patchValue({
            razonSocial: lead.empresa,
            contacto: lead.contacto,
            correo: lead.correo,
            telefono: lead.telefono,
        })
        for (const name of ['contacto', 'correo', 'telefono', 'observaciones'] as const) {
            this.form.controls[name].addValidators([Validators.required, requiredText])
            this.form.controls[name].updateValueAndValidity()
        }
        this.form.markAsDirty()
        this.modalOpen.set(false)
    }
    removeLead() {
        this.selectedLead.set(null)
        for (const name of ['contacto', 'correo', 'telefono', 'observaciones'] as const) {
            this.form.controls[name].removeValidators([Validators.required, requiredText])
            this.form.controls[name].updateValueAndValidity()
        }
    }
    save() {
        this.submitted.set(true)
        this.saveError.set('')
        if (this.form.invalid) {
            this.form.markAllAsTouched()
            return
        }
        try {
            this.store.save(this.form.getRawValue(), this.prospectoId(), this.selectedLead()?.id)
            void this.router.navigateByUrl('/prospectos')
        } catch (error) {
            this.saveError.set(
                error instanceof Error ? error.message : 'No se pudo guardar el prospecto.',
            )
        }
    }
}
