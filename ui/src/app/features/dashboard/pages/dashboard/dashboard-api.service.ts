import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { map, Observable } from 'rxjs'
import { ApiResponse } from '@app/models/api-response.model'
import { environment } from '@env/environment'
import { DashboardData, DashboardQuery } from './dashboard.model'

@Injectable({
    providedIn: 'root',
})
export class DashboardApiService {
    private http = inject(HttpClient)

    private readonly getDashboardDataUrl = `${environment.apiUrl}/crm/dashboard`

    getDashboardData(queryParams: DashboardQuery): Observable<DashboardData> {
        const params = { periodo: queryParams.periodo }
        return this.http
        .get<ApiResponse<DashboardData>>(this.getDashboardDataUrl, { params })
        .pipe(
            map((response) => {
                if (!response?.succeeded) {
                    throw new Error('Failed to fetch dashboard data')
                }
                return response.data
            }),
        )
    }
}
