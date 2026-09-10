import { CurrencyPipe } from '@angular/common'
import { Component, computed, input } from '@angular/core'
import { DashboardData, percentage } from '@features/dashboard/models/dashboard'
@Component({
    selector: 'app-dashboard-metrics',
    imports: [CurrencyPipe],
    templateUrl: './dashboard-metrics.html',
})
export class DashboardMetrics {
    readonly data = input.required<DashboardData>()
    readonly percent = computed(() => percentage(this.data().closed, this.data().closeGoal))
    readonly fill = computed(() => Math.min(100, this.percent()))
    readonly cards = computed(() => [
        ...this.data()
            .stages.slice(0, 3)
            .map((s) => ({ label: s.name, value: s.amount, color: s.color })),
        { label: 'Embudo', value: this.data().pipeline, color: '#dc3545' },
        { label: 'Cierre', value: this.data().closed, color: '#28a745' },
        { label: 'Meta de cierre', value: this.data().closeGoal, color: '#6f42c1' },
    ])
}
