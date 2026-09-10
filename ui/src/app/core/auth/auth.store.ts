import { Injectable, computed, inject, signal } from '@angular/core'
import { AuthService } from './auth.service'
import { externalSessionService } from './external-session.service'
import { ExternalLoginResponse, LoginResponse, UserRole } from './auth.model'
import { firstValueFrom } from 'rxjs'
import { environment } from '@env/environment.development'
import { UserMode } from '../models/user-mode.model'

@Injectable({
    providedIn: 'root',
})
export class AuthStore {
    private readonly authService = inject(AuthService)
    private readonly externalSessionService = inject(externalSessionService)

    #externalSession = signal<ExternalLoginResponse>({
        loggedIn: false,
        userId: null,
        userName: null,
        role: null,
        sucursalId: null,
        rikId: null
    })

    #state = signal<LoginResponse>({
        token: '',
        refreshToken: '',
        sucursal: ''
    })

    protected readonly isDevelopment = !environment.production

    readonly session = computed(() => this.#externalSession())
    readonly isExternalSessionAuthenticated = computed(() =>
        this.#externalSession() !== null &&
        this.#externalSession().loggedIn &&
        this.#externalSession().userId !== null
    )
    readonly isFullyAuthenticated = computed(() =>
        this.isExternalSessionAuthenticated() &&
        this.#state().token !== ''
    )
    readonly accessToken = computed(() => this.#state().token)
    readonly mode = computed<UserMode>(() => this.#externalSession().sucursalId == null ? 'central': 'sucursal')
    readonly isCentral = computed(() => this.#externalSession().sucursalId == null)
    readonly isSucursal = computed(() => !this.isCentral())
    readonly isManager = computed(() => this.#externalSession().role === UserRole.Manager && this.isSucursal())
    readonly sucursalId = computed(() => this.#externalSession().sucursalId ?? '')

    async initialize(): Promise<void> {
        try {
            const externalSession = await this.externalSessionService.getExternalSession()
            this.setExternalSession(externalSession)

            if (!this.isExternalSessionAuthenticated()) {
                this.clearExternalSession()
                this.clearState()
                return
            }

            const session = await firstValueFrom(
                this.authService.login({
                    userId: externalSession.userId!,
                    sucursalId: externalSession.sucursalId ?? null
                })
            )

            this.setState(session)
            return

        } catch (error) {
            this.clearExternalSession()
            this.clearState()
            console.error('Failed to initialize auth store', error)
        }
    }

    setExternalSession(externalSession: ExternalLoginResponse): void {
        this.#externalSession.set(externalSession)
    }

    clearExternalSession(): void {
        this.#externalSession.set({
            loggedIn: false,
            userId: null,
            userName: null,
            role: null,
            sucursalId: null,
            rikId: null
        })
    }

    setState(state: LoginResponse): void {
        this.#state.set(state)
    }

    clearState(): void {
        this.#state.set({
            token: '',
            refreshToken: '',
            sucursal: ''
        })
    }
}
