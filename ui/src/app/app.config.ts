import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideAppInitializer,
    inject,
} from '@angular/core'
import { AuthStore } from './core/auth/auth.store'
import { provideRouter } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { authInterceptor } from './core/auth/auth.interceptor'

import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideRouter(routes),
        provideAppInitializer(() => {
            return inject(AuthStore).initialize()
        }),
    ],
}
