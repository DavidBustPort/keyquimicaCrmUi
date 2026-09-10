import { Observable, map } from 'rxjs'
import { LoginRequest, LoginResponse } from './auth.model'
import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient)
    private refreshRequest$: Observable<void> | null = null

    private readonly loginUrl = `${environment.apiUrl}/auth/token`

    login(payload: LoginRequest): Observable<LoginResponse> {
        return this.http
        .post<ApiResponse<LoginResponse>>(this.loginUrl, payload)
        .pipe(
            map((response) => {
				if (!response?.succeeded) {
					throw new Error(response?.message || 'No se pudo iniciar sesión.')
				}
				return response.data
			})
        )
    }
}
