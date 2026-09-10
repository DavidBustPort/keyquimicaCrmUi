import { Component, computed, effect, inject, input, signal } from '@angular/core'
import { Lead } from '@features/leads/models/lead'
import { LeadsService } from '@features/leads/data-access/leads.service'
import { LeadStatus } from '@features/leads/components/lead-status/lead-status'
import { LeadAssignment } from '@features/leads/components/lead-assignment/lead-assignment'
import { LeadRejection } from '@features/leads/components/lead-rejection/lead-rejection'
@Component({
    selector: 'app-lead-detail',
    imports: [LeadStatus, LeadAssignment, LeadRejection],
    templateUrl: './lead-detail.html',
})
export class LeadDetail {
    readonly lead = input.required<Lead>()
    readonly store = inject(LeadsService)
    readonly action = signal<'detail' | 'sucursal' | 'representante' | 'rechazar'>('detail')
    readonly branch = computed(() => this.lead().sucursal || 'Sin sucursal')
    readonly representative = computed(() => this.lead().representanteId || 'Sin asignar')
    constructor() {
        effect(() => {
            this.lead()
            this.store.auth.isManager()
            this.action.set('detail')
        })
    }
}
