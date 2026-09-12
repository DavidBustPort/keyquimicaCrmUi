import { CurrencyPipe, DecimalPipe } from '@angular/common'
import { Component, input } from '@angular/core'
import { DashboardData } from '@features/dashboard/models/dashboard'
@Component({
    selector: 'app-dashboard-statistics',
    imports: [CurrencyPipe, DecimalPipe],
    templateUrl: './dashboard-statistics.html',
    styles: [`
        thead tr:first-child th:nth-child(2),
        thead tr:nth-child(2) th:nth-child(-n + 3) {
            background: #dceeff;
            color: #14568d;
            font-weight: 700;
            border-bottom-color: #a7cdec;
        }
        tbody td:nth-child(n + 2):nth-child(-n + 4),
        tfoot td:nth-child(n + 2):nth-child(-n + 4) {
            background: #eff7ff;
            color: #14568d;
            font-weight: 600;
        }
    `],
})
export class DashboardStatistics {
    readonly data = input.required<DashboardData>()
    previousTotal() {
        return this.data().stages.reduce((sum, s) => sum + s.previousAmount, 0)
    }
    variation(current: number, previous: number): number | null {
        return previous > 0 ? ((current - previous) / previous) * 100 : null
    }
    growth() {
        return this.variation(this.data().total, this.previousTotal())
    }
}
