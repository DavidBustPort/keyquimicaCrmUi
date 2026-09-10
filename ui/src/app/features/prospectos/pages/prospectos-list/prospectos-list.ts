import { Component, computed, inject, signal } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { tap } from 'rxjs'
import {
    ProspectosMockStore,
    ETAPAS,
    UENS,
    SEGMENTOS,
    TIPOS_CLIENTE,
    TERRITORIOS,
} from '@features/prospectos/data-access/prospectos-mock.store'
import { Prospecto } from '@features/prospectos/models/prospecto'
import { SelectField } from '@shared/ui/select-field/select-field'
import { Modal } from '@shared/ui/modal/modal'
import { Pagination } from '@shared/ui/pagination/pagination'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
@Component({
    selector: 'app-prospectos-list',
    imports: [
        CurrencyPipe,
        ReactiveFormsModule,
        RouterLink,
        SelectField,
        Modal,
        Pagination,
        EmptyState,
    ],
    templateUrl: './prospectos-list.html',
})
export class ProspectosList {
    readonly store = inject(ProspectosMockStore)
    private readonly fb = inject(FormBuilder).nonNullable
    readonly page = signal(1)
    readonly size = signal(10)
    readonly detail = signal<Prospecto | null>(null)
    readonly showDetails = signal(false)
    readonly filters = this.fb.group({
        search: [''],
        period: [''],
        fuente: [''],
        registro: [''],
        estatus: [''],
        etapa: [''],
        etapaLead: [''],
    })
    readonly filterValue = toSignal(this.filters.valueChanges.pipe(tap(() => this.page.set(1))), {
        initialValue: this.filters.getRawValue(),
    })
    readonly sources = [
        { value: 'TD', label: 'TD · Tradicional' },
        { value: 'LD', label: 'LD · Leads' },
    ]
    readonly registrations = [
        { value: 'complete', label: 'Completo' },
        { value: 'incomplete', label: 'Incompleto' },
    ]
    readonly statuses = [
        { value: 'Abierto', label: 'Abierto' },
        { value: 'Cerrado', label: 'Cerrado' },
    ]
    readonly stages = ETAPAS.map((value) => ({ value, label: value }))
    readonly leadStages = [
        { value: 'gte', label: 'CDI → GTE' },
        { value: 'rik', label: 'CDI → RIK' },
    ]
    readonly filtered = computed(() => {
        const f = this.filterValue()
        return this.store
            .prospectos()
            .filter(
                (p) =>
                    (!f.search ||
                        p.razonSocial
                            .toLocaleLowerCase()
                            .includes(f.search.trim().toLocaleLowerCase()) ||
                        String(p.id).includes(f.search.trim())) &&
                    (!f.period || p.fecha.startsWith(f.period)) &&
                    (!f.fuente || p.fuente === f.fuente) &&
                    (!f.registro || p.registro === (f.registro === 'complete')) &&
                    (!f.estatus || p.estatus === f.estatus) &&
                    (!f.etapa || p.etapas.some((e) => e.nombre === f.etapa && e.proyectos > 0)) &&
                    (!f.etapaLead || p.etapaLead === f.etapaLead),
            )
    })
    readonly rows = computed(() =>
        this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()),
    )
    readonly totalVpo = computed(() => this.filtered().reduce((sum, p) => sum + p.vpo, 0))
    readonly completed = computed(() => this.filtered().filter((p) => p.registro).length)
    readonly detailFields = computed(() => {
        const p = this.detail()
        if (!p) return []
        const name = (list: { value: string; label: string }[], id: string) =>
            list.find((o) => o.value === id)?.label || 'Sin definir'
        return [
            { label: 'Razón social', value: p.razonSocial },
            { label: 'Contacto', value: p.contacto },
            { label: 'Correo electrónico', value: p.correo },
            { label: 'Teléfono', value: p.telefono },
            { label: 'UEN', value: name(UENS, p.uenId) },
            { label: 'Segmento', value: name(SEGMENTOS, p.segmentoId) },
            { label: 'Tipo de cliente', value: name(TIPOS_CLIENTE, p.tipoClienteId) },
            { label: 'Territorio', value: name(TERRITORIOS, p.territorioId) },
            { label: 'Observaciones RIK', value: p.observaciones },
        ]
    })
    toggleDetails() {
        this.showDetails.update((value) => !value)
        if (!this.showDetails()) this.filters.patchValue({ etapa: '', etapaLead: '' })
    }
    clear() {
        this.filters.reset()
        this.page.set(1)
    }
    exportCsv() {
        const quote = (value: unknown) =>
            '"' +
            String(value ?? '')
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
            '"'
        const rows = [
            [
                'ID',
                'Prospecto',
                'Fuente',
                'Fecha',
                'Estatus',
                'Registro',
                'VPO',
                'Contacto',
                'Correo',
                'Teléfono',
                'Observaciones',
            ],
            ...this.filtered().map((p) => [
                p.id,
                p.razonSocial,
                p.fuente,
                p.fecha,
                p.estatus,
                p.registro ? 'Completo' : 'Incompleto',
                p.vpo,
                p.contacto,
                p.correo,
                p.telefono,
                p.observaciones,
            ]),
        ]
        const blob = new Blob(
            ['\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')],
            {
                type: 'text/csv;charset=utf-8;',
            },
        )
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'prospectos.csv'
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}
