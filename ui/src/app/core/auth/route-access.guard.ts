import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthStore } from './auth.store'
export const routeAccessGuard: CanActivateFn = (route) => {
    const auth = inject(AuthStore)
    const modes = route.data['modes'] as string[] | undefined
    return auth.isFullyAuthenticated() && (!modes || modes.includes(auth.mode()))
        ? true
        : inject(Router).createUrlTree(['/no-access'])
}
