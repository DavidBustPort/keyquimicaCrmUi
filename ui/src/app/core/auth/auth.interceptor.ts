import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, of, switchMap, throwError } from 'rxjs'
import { AuthStore } from '@app/core/auth/auth.store'
import { environment } from '@env/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const base = environment.apiUrl.replace(/\/$/, '')
	if (!req.url.startsWith(base + '/')) return next(req)
	const auth = inject(AuthStore)
	const path = req.url.split('?')[0]
	const authentication = path === base + '/auth/token' || path === base + '/auth/refresh-token'
	const token = auth.accessToken()
	const session = auth.session()
	const headers: Record<string, string> = { 'X-Mode': auth.mode() }
	if (auth.isSucursal()) headers['X-Sucursal-Id'] = String(auth.sucursalId())
	if (!authentication && token) headers['Authorization'] = 'Bearer ' + token
	const request = req.clone({ setHeaders: headers })
	return next(request).pipe(
		catchError((error) => {
			if (authentication || !(error instanceof HttpErrorResponse) || error.status !== 401 || !token || session !== auth.session()) return throwError(() => error)
			const current = auth.accessToken()
			if (!current) return throwError(() => error)
			const renewal = current !== token ? of(current) : auth.renewToken()
			return renewal.pipe(
				switchMap((fresh) => {
					if (session !== auth.session()) return throwError(() => new Error('La sesión cambió.'))
					return next(request.clone({ setHeaders: { Authorization: 'Bearer ' + fresh } })).pipe(
						catchError((retryError) => {
							if (retryError instanceof HttpErrorResponse && retryError.status === 401 && auth.accessToken() === fresh) auth.clearState()
							return throwError(() => retryError)
						})
					)
				})
			)
		})
	)
}
