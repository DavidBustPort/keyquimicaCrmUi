import { Component, computed, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MultiSelect } from '@shared/ui/multi-select/multi-select'
import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { DashboardService } from '../../pages/dashboard/dashboard.service'
@Component({
    selector: 'app-dashboard-filters',
    imports: [FormsModule, MultiSelect, MonthCalendar],
    templateUrl: './dashboard-filters.html',
})
export class DashboardFilters {
    readonly store = inject(DashboardService)

    readonly auth = this.store.auth
    readonly draft = this.store.filter
    readonly groups = ['CDI PROPIOS', 'CDC PROPIOS', 'CDI FRANQUICIAS', 'CDC FRANQUICIAS']

    readonly branches = computed(() =>
        this.store.branches().map((b) => ({ value: String(b.id), label: b.name })),
    )

    readonly reps = computed(() =>
        this.store.reps().map((r) => ({ value: String(r.id), label: `${r.id} - ${r.name}` })),
    )
}
