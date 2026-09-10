export enum UserRole {
    Rik = 'Rik',
    Manager = 'Gte',
}

export interface LoginRequest {
	userId: number
    sucursalId?: number | null
}

export interface LoginResponse {
    token: string
    refreshToken: string
    sucursal: string
}

export interface ExternalLoginResponse {
    loggedIn: boolean
    userId: number | null
    userName: string | null
    role?: UserRole | null
    sucursalId: number | null
    description?: string
    rikId: number | null
}
