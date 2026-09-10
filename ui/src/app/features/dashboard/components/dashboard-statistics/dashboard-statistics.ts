import { CurrencyPipe, DecimalPipe } from '@angular/common'
import { Component, input } from '@angular/core'
import { DashboardData } from '@features/dashboard/models/dashboard'
@Component({
    selector: 'app-dashboard-statistics',
    imports: [CurrencyPipe, DecimalPipe],
    templateUrl: './dashboard-statistics.html',
})
export class DashboardStatistics {
    readonly data = input.required<DashboardData>()
    previousTotal() {
        return this.data().stages.reduce((sum, s) => sum + s.previousAmount, 0)
    }
    growth() {
        const previous = this.previousTotal()
        return previous
            ? ((this.data().total / this.data().monthCount - previous) / previous) * 100
            : null
    }
}
