import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { map } from 'rxjs'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { IntegralidadQuery, normalizeRow } from '@features/integralidad/models/integralidad'
@Injectable({ providedIn: 'root' })
export class IntegralidadApiService {
	private readonly http = inject(HttpClient)
	private readonly url = environment.apiUrl + '/crm/integralidad'
	private params(query: IntegralidadQuery) {
		return Object.fromEntries(
			Object.entries(query)
				.filter(([, v]) => v !== null)
				.map(([k, v]) => [k, String(v)])
		)
	}
	list(query: IntegralidadQuery) {
		return this.http.get<ApiResponse<{ rows: Record<string, unknown>[]; totals: Record<string, unknown>[] }>>(this.url, { params: this.params(query) }).pipe(
			map((r) => {
				if (!r.succeeded || !r.data) throw new Error(r.message || r.errors?.join(' ') || 'No se pudo consultar la integralidad.')
				return { rows: r.data.rows.map(normalizeRow), totals: r.data.totals.map(normalizeRow) }
			})
		)
	}
	save(payload: { clientId: number; territoryId: number; segmentId: number; uenId: number; month: number; year: number; quantity: number; vpo: number }) {
		return this.http.put<ApiResponse<boolean>>(this.url + '/potenciales', payload).pipe(
			map((r) => {
				if (!r.succeeded || !r.data) throw new Error(r.errors?.join(' ') || r.message || 'No se pudieron guardar los potenciales.')
				return true
			})
		)
	}
	export(query: IntegralidadQuery, detailed: boolean) {
		return this.http.get(this.url + '/excel', { params: { ...this.params(query), detailed: String(detailed) }, responseType: 'blob' })
	}
}
