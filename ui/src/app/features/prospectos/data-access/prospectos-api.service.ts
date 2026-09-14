import { effect, inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { map, Observable, shareReplay } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { Lead } from '@features/leads/models/lead'
export interface LeadSuggestion {
	id: number
	empresa: string
	contacto: string | null
	correo: string | null
	telefono: string | null
	fechaRegistro: string
	medioComunicacion: string | null
	segmento: string | null
	productoInteres: string | null
	comentarios: string | null
}
import { CatalogOption, ProspectoDetail, ProspectoPayload, ProspectosQuery, ProspectosResponse } from '@features/prospectos/models/prospecto'
@Injectable({ providedIn: 'root' })
export class ProspectosApiService {
	private readonly http = inject(HttpClient)
	private readonly auth = inject(AuthStore)
	private catalogScope = ''
	private readonly catalogCache = new Map<string, Observable<CatalogOption[]>>()
	constructor() {
		effect(() => this.syncCatalogScope())
	}
	private syncCatalogScope() {
		const scope = JSON.stringify([this.auth.isFullyAuthenticated(), this.auth.session()])
		if (scope !== this.catalogScope) {
			this.catalogCache.clear()
			this.catalogScope = scope
		}
	}
	private catalog(path: string, params?: { uenId: number }) {
		this.syncCatalogScope()
		const key = path + JSON.stringify(params)
		let request = this.catalogCache.get(key)
		if (!request) {
			request = this.http.get<ApiResponse<CatalogOption[]>>(environment.apiUrl + path, { params }).pipe(map((r) => this.unwrap(r)), shareReplay({ bufferSize: 1, refCount: false }))
			this.catalogCache.set(key, request)
		}
		return request
	}
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
		return this.catalog('/catalogs/uens')
	}
	customerTypes() {
		return this.catalog('/catalogs/tipos-cliente')
	}
	territories() {
		return this.catalog('/catalogs/territorios')
	}
	suggestions(query: { page: number; itemsPerPage: number; filter: string }) {
		return this.http.get<ApiResponse<{ totalRows: number; leads: LeadSuggestion[] }>>(environment.apiUrl + '/crm/leads/suggestions', { params: this.params(query) }).pipe(
			map((r) => {
				const result = this.unwrap(r)
				return {
					totalRows: result.totalRows,
					leads: result.leads.map((s): Lead => ({
						id: s.id,
						empresa: s.empresa,
						contacto: s.contacto ?? '',
						correo: s.correo ?? '',
						telefono: s.telefono ?? '',
						fecha: s.fechaRegistro,
						medio: s.medioComunicacion ?? '',
						segmento: s.segmento ?? '',
						producto: s.productoInteres ?? '',
						comentarios: s.comentarios ?? '',
						ciudad: '',
						sucursalId: '',
						representanteId: '',
						estado: 'Disponible'
					}))
				}
			})
		)
	}
	segments(uenId: number) {
		return this.catalog('/catalogs/segmentos', { uenId })
	}
	rejectLead(id: number, reason: string, rejectionReasonId = 3) {
		return this.http.post<ApiResponse<boolean>>(environment.apiUrl + '/crm/leads/' + id + '/reject', { leadId: id, rejectionReasonId, rejectionComment: reason }).pipe(
			map((r) => {
				if (!this.unwrap(r)) throw new Error(r.message || 'No se pudo rechazar el lead.')
				return true
			})
		)
	}
}
