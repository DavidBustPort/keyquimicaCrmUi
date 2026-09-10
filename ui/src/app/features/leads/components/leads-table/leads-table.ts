import { Component, input, output } from '@angular/core'
import { Lead } from '@features/leads/models/lead'
import { LeadStatus } from '@features/leads/components/lead-status/lead-status'
import { REPRESENTANTES, SUCURSALES } from '@features/leads/data-access/leads.catalogos'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
@Component({
    selector: 'app-leads-table',
    imports: [LeadStatus, EmptyState],
    templateUrl: './leads-table.html',
})
export class LeadsTable {
    readonly rows = input.required<Lead[]>()
    readonly manager = input(false)
    readonly selected = output<number>()
    branch(id: string) {
        return SUCURSALES.find((s) => s.value === id)?.label ?? 'Sin sucursal'
    }
    representative(id: string) {
        return REPRESENTANTES.find((r) => r.value === id)?.label ?? 'Sin asignar'
    }
}
