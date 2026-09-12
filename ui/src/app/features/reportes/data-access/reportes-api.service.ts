import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { catchError, from, map, throwError } from 'rxjs'
import { HttpErrorResponse } from '@angular/common/http'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { ReportCatalog, ReportQuery } from '@features/reportes/models/reporte'
@Injectable({ providedIn: 'root' })
export class ReportesApiService {
	private readonly http = inject(HttpClient)
	catalog(name: 'uens' | 'segmentos' | 'sucursales' | 'tipos-producto' | 'proveedores-productos', params: Record<string, string> = {}) {
		return this.http.get<ApiResponse<ReportCatalog[]>>(environment.apiUrl + '/catalogs/' + name, { params }).pipe(
			map((r) => {
				if (!r.succeeded) throw new Error(r.errors?.join(' ') || r.message || 'No se pudo cargar el catálogo.')
				return (r.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))
			})
		)
	}
	download(query: ReportQuery) {
		let params = new HttpParams()
		for (const [key, value] of Object.entries(query)) if (value !== null) params = params.set(key, String(value))
		return this.requestFile('gestion-proyectos', params)
	}
	downloadReport(kind: 'tracking-cerrados' | 'prospeccion', query: object) {
		let params = new HttpParams()
		for (const [key, value] of Object.entries(query)) if (value != null) params = params.set(key, String(value))
		return this.requestFile(kind, params)
	}
	private requestFile(kind: string, params: HttpParams) {
		return this.http.get(environment.apiUrl + '/crm/reports/' + kind, { params, responseType: 'blob' }).pipe(
			map((blob) => {
				if (blob.type.includes('json')) throw new Error('El servidor no pudo generar el reporte.')
				return blob
			}),
			catchError((error) => (error instanceof HttpErrorResponse && error.error instanceof Blob ? from(this.readError(error.error)) : throwError(() => (error instanceof Error ? error : new Error('No se pudo descargar el reporte.')))))
		)
	}
	private async readError(blob: Blob): Promise<never> {
		let message = 'No se pudo descargar el reporte. Intenta nuevamente.'
		try {
			const response = JSON.parse(await blob.text())
			message = response.errors?.join(' ') || response.message || message
		} catch {}
		throw new Error(message)
	}
}
