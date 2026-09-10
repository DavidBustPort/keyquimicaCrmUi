import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LeadsService } from '../../data-access/leads.service'
import { LeadsTable } from '../../components/leads-table/leads-table'
import { LeadDetail } from '../../components/lead-detail/lead-detail'
import { Pagination } from '@shared/ui/pagination/pagination'
import { Modal } from '@shared/ui/modal/modal'
@Component({
    host: { class: 'block' },
    selector: 'app-leads',
    imports: [FormsModule, LeadsTable, LeadDetail, Pagination, Modal],
    providers: [LeadsService],
    templateUrl: './leads.html',
})
export class Leads {
    readonly store = inject(LeadsService)
}
