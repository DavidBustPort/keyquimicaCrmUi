import { Component, computed, inject, input, output, signal } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import {
    OportunidadesMockStore,
    esEditable,
    montoProyecto,
    tienePendientes,
} from '@features/oportunidades/data-access/oportunidades-mock.store'
import {
    APLICACIONES,
    AREAS,
    SOLUCIONES,
    MOTIVOS_CANCELACION,
    catalogName,
} from '@features/oportunidades/data-access/oportunidades.catalogos'
import { Oportunidad } from '@features/oportunidades/models/oportunidad'
import { Modal } from '@shared/ui/modal/modal'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
@Component({
    selector: 'app-proyectos-table',
    imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, Modal, EmptyState],
    templateUrl: './proyectos-table.html',
})
export class ProyectosTable {
    readonly rows = input.required<Oportunidad[]>()
    readonly embedded = input(false)
    readonly edit = output<Oportunidad>()
    readonly store = inject(OportunidadesMockStore)
    readonly selectedId = signal<number | null>(null)
    readonly selected = computed(
        () => this.store.proyectos().find((p) => p.id === this.selectedId()) ?? null,
    )
    readonly action = signal<'detail' | 'cancel' | 'close' | 'vpo'>('detail')
    readonly reason = new FormControl('', { nonNullable: true })
    readonly explanation = new FormControl('', { nonNullable: true })
    readonly vpo = new FormControl(0, { nonNullable: true })
    readonly error = signal('')
    readonly editable = esEditable
    readonly amount = montoProyecto
    readonly pending = tienePendientes
    readonly reasons = MOTIVOS_CANCELACION
    readonly application = (id: string) => catalogName(APLICACIONES, id)
    readonly area = (id: string) => catalogName(AREAS, id)
    readonly solution = (id: string) => catalogName(SOLUCIONES, id)
    client(id: number) {
        return this.store.clientes().find((c) => c.id === id)
    }
    open(p: Oportunidad) {
        this.selectedId.set(p.id)
        this.action.set('detail')
        this.error.set('')
        this.vpo.setValue(p.vpo)
        this.reason.reset()
        this.explanation.reset()
    }
    execute(action: 'cancel' | 'close' | 'negotiate' | 'vpo' | 'approve') {
        const p = this.selected()
        if (!p) return
        this.error.set('')
        try {
            if (action === 'cancel')
                this.store.transition(
                    p.id,
                    'Cancelada',
                    this.reason.value === 'Otro'
                        ? this.explanation.value.trim()
                        : this.reason.value,
                )
            if (action === 'close') this.store.transition(p.id, 'Cierre')
            if (action === 'negotiate') this.store.transition(p.id, 'Negociación')
            if (action === 'vpo') this.store.updateVpo(p.id, this.vpo.value)
            if (action === 'approve') this.store.approvePrices(p.id)
            this.action.set('detail')
        } catch (e) {
            this.error.set((e as Error).message)
        }
    }
    editSelected(p: Oportunidad) {
        this.selectedId.set(null)
        this.edit.emit(p)
    }
}
