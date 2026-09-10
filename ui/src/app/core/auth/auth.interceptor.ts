import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { AuthStore } from '@app/core/auth/auth.store'
import { environment } from '@env/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authStore = inject(AuthStore)

    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req)
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${authStore.accessToken()}`,
        'X-Mode': authStore.mode(),
    }

    if (authStore.isSucursal()) {
        headers['X-Sucursal-Id'] = String(authStore.sucursalId())
    }

    return next(req.clone({ setHeaders: headers }))
}

