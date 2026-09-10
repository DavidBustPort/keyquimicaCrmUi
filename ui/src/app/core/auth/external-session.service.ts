import { Injectable } from '@angular/core'
import { environment } from '@env/environment'
import { ExternalLoginResponse, UserRole } from './auth.model'
import {
    MOCK_EXTERNAL_CENTRAL_LOGIN_RESPONSE,
    MOCK_EXTERNAL_SUCURSAL_LOGIN_RESPONSE,
} from './auth.mock'

@Injectable({
    providedIn: 'root'
})
export class externalSessionService {
    readonly isDevelopment = !environment.production

    async getExternalSession(): Promise<ExternalLoginResponse> {
        if (this.isDevelopment) {
            const mockAuthSession = environment.mockAuthSession
            console.log('Mock auth session:', mockAuthSession)
            if (mockAuthSession.mode === 'central') {
                return MOCK_EXTERNAL_CENTRAL_LOGIN_RESPONSE
            }

            if (mockAuthSession.mode === 'sucursal') {
                const role = mockAuthSession.isModeManager ? UserRole.Manager : UserRole.Rik
                return MOCK_EXTERNAL_SUCURSAL_LOGIN_RESPONSE(role)
            }

            throw new Error(`Modo de sesión no válido: ${mockAuthSession.mode}`)
        }

        // Implement the logic to get the external session here for non-development environments
        throw new Error('La sesión externa de producción aún no está implementada')
    }
}
