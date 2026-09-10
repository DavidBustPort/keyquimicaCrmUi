import { Component, computed, input } from '@angular/core'
import { Lead, leadStatus } from '@features/leads/models/lead'
@Component({
    selector: 'app-lead-status',
    templateUrl: './lead-status.html',
})
export class LeadStatus {
    readonly lead = input.required<Lead>()
    readonly label = computed(() => leadStatus(this.lead()))
}
