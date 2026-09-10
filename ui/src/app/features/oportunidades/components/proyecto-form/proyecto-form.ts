import { Component, effect, inject, input, output, signal } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms'
import { toSignal } from '@angular/core/rxjs-interop'
import { OportunidadesMockStore } from '@features/oportunidades/data-access/oportunidades-mock.store'
import {
    AREAS,
    APLICACIONES,
    SOLUCIONES,
} from '@features/oportunidades/data-access/oportunidades.catalogos'
import { SelectField } from '@shared/ui/select-field/select-field'
import { Oportunidad, TipoVenta } from '@features/oportunidades/models/oportunidad'
@Component({
    selector: 'app-proyecto-form',
    imports: [CurrencyPipe, ReactiveFormsModule, SelectField],
    templateUrl: './proyecto-form.html',
})
export class ProyectoForm {
    readonly prospectoId = input.required<number>()
    readonly saved = output<{ projects: Oportunidad[]; continueProducts: boolean }>()
    readonly dirty = output<boolean>()
    readonly store = inject(OportunidadesMockStore)
    readonly areas = AREAS
    readonly form = inject(FormBuilder).nonNullable.group({
        tipoVenta: ['Instalada'],
        areaId: [''],
        solucionId: [''],
    })
    readonly area = toSignal(this.form.controls.areaId.valueChanges, { initialValue: '' })
    readonly solution = toSignal(this.form.controls.solucionId.valueChanges, { initialValue: '' })
    readonly error = signal('')
    readonly apps = signal<
        {
            id: string
            label: string
            potencial: number
            selected: FormControl<boolean>
            vpo: FormControl<number>
        }[]
    >([])
    constructor() {
        effect(() => {
            this.prospectoId()
            this.form.reset()
            this.error.set('')
            this.dirty.emit(false)
        })
        effect(() => {
            this.area()
            this.form.controls.solucionId.setValue('')
        })
        effect(() => {
            const solution = this.solution()
            this.apps.set(
                APLICACIONES.filter((a) => a.solucionId === solution).map((a) => ({
                    id: a.value,
                    label: a.label,
                    potencial: a.potencial,
                    selected: new FormControl(false, { nonNullable: true }),
                    vpo: new FormControl(0, { nonNullable: true }),
                })),
            )
        })
    }
    get solutions() {
        return SOLUCIONES.filter((s) => s.areaId === this.form.controls.areaId.value)
    }
    used(id: string) {
        return this.store
            .proyectos()
            .some(
                (p) =>
                    p.prospectoId === this.prospectoId() &&
                    p.aplicacionId === id &&
                    p.etapa !== 'Cancelada',
            )
    }
    vpt(potential: number) {
        return (
            ((this.store.dimensiones()[this.prospectoId()] ?? 0) *
                this.store.dimensionInfo(this.prospectoId()).valor *
                potential) /
            100
        )
    }
    save(continueProducts: boolean) {
        this.error.set('')
        try {
            const projects = this.store.create({
                prospectoId: this.prospectoId(),
                areaId: this.form.controls.areaId.value,
                solucionId: this.form.controls.solucionId.value,
                tipoVenta: this.form.controls.tipoVenta.value as TipoVenta,
                aplicaciones: this.apps()
                    .filter((a) => a.selected.value)
                    .map((a) => ({ id: a.id, vpo: a.vpo.value })),
            })
            this.form.reset()
            this.dirty.emit(false)
            this.saved.emit({ projects, continueProducts })
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
}
