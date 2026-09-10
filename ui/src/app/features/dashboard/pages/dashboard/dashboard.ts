import { CurrencyPipe, DecimalPipe } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { DashboardMockStore } from '@features/dashboard/data-access/dashboard-mock.store'
import { DashboardFilters } from '@features/dashboard/components/dashboard-filters/dashboard-filters'
import { DashboardMetrics } from '@features/dashboard/components/dashboard-metrics/dashboard-metrics'
import { DashboardStatistics } from '@features/dashboard/components/dashboard-statistics/dashboard-statistics'
import { ProgressGauge } from '@shared/ui/progress-gauge/progress-gauge'

@Component({
    host: { class: 'block' },
    selector: 'app-dashboard',
    imports: [
        CurrencyPipe,
        DecimalPipe,
        DashboardFilters,
        DashboardMetrics,
        DashboardStatistics,
        ProgressGauge,
    ],
    templateUrl: './dashboard.html',
})
export class Dashboard {
    readonly store = inject(DashboardMockStore)
    readonly data = this.store.data
    readonly sourceTotal = computed(() => this.data().sources.reduce((sum, s) => sum + s.count, 0))
    readonly sourceGradient = computed(() => {
        const total = this.sourceTotal()
        return total
            ? 'conic-gradient(#00a3ff 0% ' +
                  (this.data().sources[0].count / total) * 100 +
                  '%, #a855f7 ' +
                  (this.data().sources[0].count / total) * 100 +
                  '% 100%)'
            : '#e8edf4'
    })
    sourceShare(count: number) {
        return this.sourceTotal() ? Math.round((count / this.sourceTotal()) * 100) : 0
    }
    scrollTop() {
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
        })
    }
}
