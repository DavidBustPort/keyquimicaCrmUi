import { Component, computed, effect, inject, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { Lead } from '@features/leads/models/lead'
import { LeadsMockStore } from '@features/leads/data-access/leads-mock.store'
import { REPRESENTANTES, SUCURSALES } from '@features/leads/data-access/leads.catalogos'
import { LeadStatus } from '@features/leads/components/lead-status/lead-status'
import { LeadAssignment } from '@features/leads/components/lead-assignment/lead-assignment'
import { LeadRejection } from '@features/leads/components/lead-rejection/lead-rejection'
@Component({
    selector: 'app-lead-detail',
    imports: [RouterLink, LeadStatus, LeadAssignment, LeadRejection],
    templateUrl: './lead-detail.html',
})
export class LeadDetail {
    readonly lead = input.required<Lead>()
    readonly store = inject(LeadsMockStore)
    readonly action = signal<'detail' | 'sucursal' | 'representante' | 'rechazar'>('detail')
    readonly active = computed(
        () => this.lead().estado === 'Disponible' || this.lead().estado === 'Pendiente',
    )
    readonly branch = computed(
        () => SUCURSALES.find((s) => s.value === this.lead().sucursalId)?.label ?? 'Sin sucursal',
    )
    readonly representative = computed(
        () =>
            REPRESENTANTES.find((r) => r.value === this.lead().representanteId)?.label ??
            'Sin asignar',
    )
    constructor() {
        effect(() => {
            this.lead()
            this.store.view()
            this.action.set('detail')
        })
    }
}
