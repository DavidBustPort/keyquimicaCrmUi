import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { map } from 'rxjs'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { CatalogOption, ProspectoDetail, ProspectoPayload, ProspectosQuery, ProspectosResponse } from '@features/prospectos/models/prospecto'
@Injectable({ providedIn: 'root' })
export class ProspectosApiService {
	private readonly http = inject(HttpClient)
	private readonly url = environment.apiUrl + '/crm/prospectos'
	private params(query: object) {
		let params = new HttpParams()
		for (const [key, value] of Object.entries(query)) if (value !== null && value !== '') params = params.set(key, String(value))
		return params
	}
	private unwrap<T>(response: ApiResponse<T>) {
		if (!response.succeeded || response.data == null) throw new Error(response.errors?.join(' ') || response.message || 'No se pudo completar la solicitud.')
		return response.data
	}
	list(query: ProspectosQuery) {
		return this.http.get<ApiResponse<ProspectosResponse>>(this.url, { params: this.params(query) }).pipe(map((r) => this.unwrap(r)))
	}
	detail(id: number) {
		return this.http.get<ApiResponse<ProspectoDetail>>(this.url + '/' + id).pipe(map((r) => this.unwrap(r)))
	}
	save(payload: ProspectoPayload, id?: number, leadId?: number) {
		const request = id === undefined ? this.http.post<ApiResponse<boolean>>(this.url, { ...payload, idLead: leadId ?? null }) : this.http.put<ApiResponse<boolean>>(this.url, { ...payload, prospectoId: id })
		return request.pipe(
			map((r) => {
				if (!this.unwrap(r)) throw new Error(r.message || 'No se pudo guardar el prospecto.')
				return r.message || (id === undefined ? 'Prospecto creado correctamente.' : 'Prospecto actualizado correctamente.')
			})
		)
	}
	export(query: ProspectosQuery) {
		const { page, itemsPerPage, ...filters } = query
		return this.http.get(this.url + '/excel', { params: this.params(filters), responseType: 'blob' })
	}
	uens() {
		return this.http.get<ApiResponse<CatalogOption[]>>(environment.apiUrl + '/catalogs/uens').pipe(map((r) => this.unwrap(r)))
	}
	segments(uenId: number) {
		return this.http.get<ApiResponse<CatalogOption[]>>(environment.apiUrl + '/catalogs/segmentos', { params: { uenId } }).pipe(map((r) => this.unwrap(r)))
	}
	rejectLead(id: number, reason: string) {
		return this.http.post<ApiResponse<boolean>>(environment.apiUrl + '/crm/leads/' + id + '/reject', { leadId: id, rejectionReasonId: 3, rejectionComment: reason }).pipe(
			map((r) => {
				if (!this.unwrap(r)) throw new Error(r.message || 'No se pudo rechazar el lead.')
				return true
			})
		)
	}
}
