import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { map } from 'rxjs'
import { ApiResponse } from '@app/models/api-response.model'
import { environment } from '@env/environment'
export interface RikOption {
    id: number
    name: string
}
@Injectable({ providedIn: 'root' })
export class RikFilterApiService {
    private readonly http = inject(HttpClient)
    getRiks() {
        return this.http.get<ApiResponse<RikOption[]>>(`${environment.apiUrl}/catalogs/riks`).pipe(
            map((response) => {
                if (!response.succeeded) throw new Error('No se pudieron cargar los RIKs')
                return (response.data ?? [])
                    .map((rik) => ({ ...rik, id: Number(rik.id) }))
                    .filter((rik) => Number.isFinite(rik.id))
            }),
        )
    }
}
