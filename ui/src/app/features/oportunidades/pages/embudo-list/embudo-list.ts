import { Component, computed, inject, signal } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { tap } from 'rxjs'
import {
    OportunidadesMockStore,
    montoProyecto,
} from '@features/oportunidades/data-access/oportunidades-mock.store'
import {
    APLICACIONES,
    ETAPAS,
    catalogName,
} from '@features/oportunidades/data-access/oportunidades.catalogos'
import { ProyectosTable } from '@features/oportunidades/components/proyectos-table/proyectos-table'
import { Pagination } from '@shared/ui/pagination/pagination'
import { SelectField } from '@shared/ui/select-field/select-field'
import { downloadCsv } from '@shared/utils/csv'

@Component({
    selector: 'app-embudo-list',
    imports: [
        CurrencyPipe,
        ReactiveFormsModule,
        RouterLink,
        ProyectosTable,
        Pagination,
        SelectField,
    ],
    templateUrl: './embudo-list.html',
})
export class EmbudoList {
    readonly store = inject(OportunidadesMockStore)
    readonly page = signal(1)
    readonly size = signal(10)
    readonly filters = inject(FormBuilder).nonNullable.group({
        search: [''],
        period: [''],
        etapa: [''],
    })
    readonly values = toSignal(this.filters.valueChanges.pipe(tap(() => this.page.set(1))), {
        initialValue: this.filters.getRawValue(),
    })
    readonly stages = ETAPAS.map((value) => ({ value, label: value }))
    readonly filtered = computed(() => {
        const f = this.values()
        return this.store
            .proyectos()
            .filter(
                (p) =>
                    (!f.search ||
                        [
                            p.id,
                            this.store.clientes().find((c) => c.id === p.prospectoId)?.razonSocial,
                            catalogName(APLICACIONES, p.aplicacionId),
                        ]
                            .join(' ')
                            .toLowerCase()
                            .includes(f.search.trim().toLowerCase())) &&
                    (!f.period || p.fecha.startsWith(f.period)) &&
                    (!f.etapa || p.etapa === f.etapa),
            )
    })
    readonly rows = computed(() =>
        this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()),
    )
    readonly summaries = computed(() =>
        ETAPAS.map((stage) => ({
            stage,
            count: this.filtered().filter((p) => p.etapa === stage).length,
            total: this.filtered()
                .filter((p) => p.etapa === stage)
                .reduce((sum, p) => sum + (stage === 'Análisis' ? p.vpo : montoProyecto(p)), 0),
        })),
    )
    export() {
        downloadCsv('oportunidades.csv', [
            [
                'Proyecto',
                'Cliente / Prospecto',
                'Aplicación',
                'Fecha',
                'Tipo venta',
                'Etapa',
                'VPO',
                'VPT',
                'Monto',
                'ACyS',
                'Facturación',
            ],
            ...this.filtered().map((p) => [
                p.id,
                this.store.clientes().find((c) => c.id === p.prospectoId)?.razonSocial,
                catalogName(APLICACIONES, p.aplicacionId),
                p.fecha,
                p.tipoVenta,
                p.etapa,
                p.vpo,
                p.vpt,
                montoProyecto(p),
                p.acys,
                p.facturacion,
            ]),
        ])
    }
}
