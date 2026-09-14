import { TestBed } from '@angular/core/testing'
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AuthStore } from './auth.store'
import { authInterceptor } from './auth.interceptor'
import { UserRole } from './auth.model'
import { environment } from '@env/environment'
const base = environment.apiUrl

describe('Refresh token', () => {
	let http: HttpTestingController, client: HttpClient, store: AuthStore
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] })
		http = TestBed.inject(HttpTestingController)
		client = TestBed.inject(HttpClient)
		store = TestBed.inject(AuthStore)
		store.setExternalSession({ loggedIn: true, userId: 1, userName: 'Test', role: UserRole.Rik, sucursalId: 110, rikId: 45 })
		store.setState({ token: 'old-access', refreshToken: 'old-refresh', sucursal: 'Sucursal' })
	})
	afterEach(() => http.verify())
	it('shares one renewal between simultaneous 401 responses and retries with new token', () => {
		const results: unknown[] = []
		client.get(base + '/one').subscribe((v) => results.push(v))
		client.get(base + '/two').subscribe((v) => results.push(v))
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		http.expectOne(base + '/two').flush({}, { status: 401, statusText: 'Unauthorized' })
		const refresh = http.expectOne(base + '/auth/refresh-token')
		expect(refresh.request.body).toEqual({ refreshToken: 'old-refresh' })
		expect(refresh.request.headers.has('Authorization')).toBe(false)
		refresh.flush({ succeeded: true, data: { token: 'new-access', refreshToken: 'new-refresh' } })
		for (const path of ['/one', '/two']) {
			const r = http.expectOne(base + path)
			expect(r.request.headers.get('Authorization')).toBe('Bearer new-access')
			r.flush({ ok: true })
		}
		expect(results.length).toBe(2)
		expect(store.accessToken()).toBe('new-access')
	})
	it('does not recurse on failed renewal and clears expired session', () => {
		let failures = 0
		client.get(base + '/one').subscribe({ error: () => failures++ })
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		http.expectOne(base + '/auth/refresh-token').flush({}, { status: 401, statusText: 'Unauthorized' })
		expect(failures).toBe(1)
		expect(store.accessToken()).toBe('')
	})
	it('ignores late renewal after another session starts', () => {
		client.get(base + '/one').subscribe({ error: () => {} })
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		const refresh = http.expectOne(base + '/auth/refresh-token')
		store.setState({ token: 'different-session', refreshToken: 'different-refresh', sucursal: 'Other' })
		refresh.flush({ succeeded: true, data: { token: 'stale-access', refreshToken: 'stale-refresh' } })
		expect(store.accessToken()).toBe('different-session')
	})
	it('supports central renewal without a sucursal header', () => {
		store.setExternalSession({ ...store.session(), sucursalId: null })
		client.get(base + '/one').subscribe()
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		const r = http.expectOne(base + '/auth/refresh-token')
		expect(r.request.headers.get('X-Mode')).toBe('central')
		expect(r.request.headers.has('X-Sucursal-Id')).toBe(false)
		r.flush({ succeeded: true, data: { token: 'new', refreshToken: 'refresh' } })
		http.expectOne(base + '/one').flush({})
	})
	it('does not renew other origins, forbidden responses or authentication requests', () => {
		for (const url of ['https://outside.invalid/data', base + '/auth/token', base + '/auth/refresh-token']) {
			client.get(url).subscribe({ error: () => {} })
			http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' })
		}
		client.get(base + '/forbidden').subscribe({ error: () => {} })
		http.expectOne(base + '/forbidden').flush({}, { status: 403, statusText: 'Forbidden' })
		expect(store.accessToken()).toBe('old-access')
	})
	it('only retries the original request once', () => {
		client.get(base + '/one').subscribe({ error: () => {} })
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		http.expectOne(base + '/auth/refresh-token').flush({ succeeded: true, data: { token: 'new', refreshToken: 'new-refresh' } })
		http.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' })
		expect(store.accessToken()).toBe('')
	})
})
