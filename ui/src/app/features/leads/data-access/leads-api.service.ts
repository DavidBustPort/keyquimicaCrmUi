import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { map } from 'rxjs'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { LeadCatalog, LeadsQuery, LeadsResponse } from '../models/leads-api.model'
@Injectable({ providedIn: 'root' })
export class LeadsApiService {
    private readonly http = inject(HttpClient)
    private readonly url = `${environment.apiUrl}/crm/leads`
    getLeads(query: LeadsQuery) {
        let params = new HttpParams()
        for (const [key, value] of Object.entries(query))
            if (value !== null && value !== '') params = params.set(key, String(value))
        return this.http
            .get<ApiResponse<LeadsResponse>>(this.url, { params })
            .pipe(map((response) => this.unwrap(response)))
    }
    getSucursales() {
        return this.http
            .get<ApiResponse<LeadCatalog[]>>(`${environment.apiUrl}/catalogs/sucursales`, {
                params: { grupoSucursalId: 1 },
            })
            .pipe(map((response) => this.unwrap(response)))
    }
    getRiks() {
        return this.http
            .get<ApiResponse<LeadCatalog[]>>(`${environment.apiUrl}/catalogs/riks`)
            .pipe(map((response) => this.unwrap(response)))
    }
    changeBranch(leadId: number, sucursalId: number) {
        return this.http
            .put<ApiResponse<boolean>>(`${this.url}/${leadId}/update-sucursal`, {
                sucursalId,
                leadId,
            })
            .pipe(map((response) => this.updated(response)))
    }
    assign(leadId: number, rikId: number) {
        return this.http
            .post<ApiResponse<boolean>>(`${this.url}/${leadId}/assign-rik`, { rikId, leadId })
            .pipe(map((response) => this.updated(response)))
    }
    reject(leadId: number, tipoRechazoId: number, motivo: string | null) {
        return this.http
            .post<ApiResponse<boolean>>(`${this.url}/${leadId}/reject`, {
                tipoRechazoId,
                motivo,
                leadId,
            })
            .pipe(map((response) => this.updated(response)))
    }
    private unwrap<T>(response: ApiResponse<T>): T {
        if (!response.succeeded || response.data == null)
            throw new Error(response.message || 'No se pudo completar la solicitud.')
        return response.data
    }
    private updated(response: ApiResponse<boolean>) {
        if (!this.unwrap(response))
            throw new Error(response.message || 'No se pudo guardar el cambio.')
        return true
    }
}
