import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { map, Observable } from 'rxjs'
import { ApiResponse } from '@app/models/api-response.model'
import { environment } from '@env/environment'
import { DashboardCatalog, DashboardData, DashboardQuery } from './dashboard.model'

@Injectable({
	providedIn: 'root'
})
export class DashboardApiService {
	private http = inject(HttpClient)

	private readonly getDashboardDataUrl = `${environment.apiUrl}/crm/dashboard`

	getDashboardData(queryParams: DashboardQuery): Observable<DashboardData> {
		let params = new HttpParams()
		for (const [key, value] of Object.entries(queryParams)) {
			if (value !== null) params = params.set(key, String(value))
		}

		return this.http.get<ApiResponse<DashboardData>>(this.getDashboardDataUrl, { params }).pipe(
			map((response) => {
				if (!response?.succeeded || !response.data) {
					throw new Error('Failed to fetch dashboard data')
				}
				return response.data
			})
		)
	}

	getSucursales(grupoId: number): Observable<DashboardCatalog[]> {
		return this.catalog('/catalogs/sucursales', { grupoSucursalId: grupoId })
	}

	getRiks(sucursalId: number): Observable<DashboardCatalog[]> {
		return this.catalog('/catalogs/riks', { sucursalId })
	}

	private catalog(path: string, params: Record<string, number>): Observable<DashboardCatalog[]> {
		return this.http.get<ApiResponse<DashboardCatalog[]>>(`${environment.apiUrl}${path}`, { params }).pipe(
			map((response) => {
				if (!response.succeeded) throw new Error('No se pudo cargar el catálogo')
				return response.data ?? []
			})
		)
	}
}
