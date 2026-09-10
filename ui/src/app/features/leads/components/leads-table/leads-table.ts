import { Component, input, output } from '@angular/core'
import { Lead } from '@features/leads/models/lead'
import { LeadStatus } from '@features/leads/components/lead-status/lead-status'
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
}
