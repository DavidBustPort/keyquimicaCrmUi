import { ExternalLoginResponse, UserRole } from './auth.model'

const mockExternalSucursalLoginResponse: Record<UserRole, ExternalLoginResponse> = {
	[UserRole.Rik]: {
		loggedIn: true,
		userId: 1140,
		userName: 'Rik User',
		role: UserRole.Rik,
		sucursalId: 110,
		description: 'Mock Rik User',
		rikId: 475
	},
	[UserRole.Manager]: {
		loggedIn: true,
		userId: 1008,
		userName: 'Manager User',
		role: UserRole.Manager,
		sucursalId: 110,
		description: 'Mock Manager User',
		rikId: null
	}
}

const mockExternalCentralLoginResponse: ExternalLoginResponse = {
	loggedIn: true,
	userId: 1008,
	userName: 'Central User',
	role: null,
	sucursalId: null,
	description: 'Mock Central User',
	rikId: null
}

export const MOCK_EXTERNAL_SUCURSAL_LOGIN_RESPONSE = (role: UserRole) => mockExternalSucursalLoginResponse[role]
export const MOCK_EXTERNAL_CENTRAL_LOGIN_RESPONSE = mockExternalCentralLoginResponse
