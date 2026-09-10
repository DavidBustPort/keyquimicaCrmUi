import { Injectable, resource, inject } from '@angular/core'
import { DashboardApiService } from './dashboard-api.service'
import { firstValueFrom } from 'rxjs'
import { LoadingService } from '@app/core/loading/loading.service'
import { DashboardQuery } from './dashboard.model'

@Injectable()
export class DashboardService {
    private readonly apiService = inject(DashboardApiService)
    private readonly loadingService = inject(LoadingService)


    readonly dashboardResource = resource({
        params: (): DashboardQuery => ({
            periodo: 'Actual'
        }),
        loader: ({ params }) => this.loadingService.wrap(
            firstValueFrom(
                this.apiService.getDashboardData(params)
            )
        )
    })
}
