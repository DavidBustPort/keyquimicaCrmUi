import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { environment } from '@env/environment'
import { GestionProyectos } from './pages/gestion-proyectos/gestion-proyectos'
const base = environment.apiUrl
describe('Gestión de proyectos API', () => {
	const central = signal(true),
		authenticated = signal(true),
		manager = signal(false),
		session = signal({ userId: 1, sucursalId: null as number | null }),
		rik = signal<number | null>(null)
	let http: HttpTestingController
	beforeEach(() => {
		central.set(true)
		authenticated.set(true)
		manager.set(false)
		session.set({ userId: 1, sucursalId: null })
		rik.set(null)
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthStore, useValue: { isCentral: central, isFullyAuthenticated: authenticated, isManager: manager, session } },
				{ provide: RikFilterStore, useValue: { selectedRikId: rik } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify({ ignoreCancelled: true }))
	async function setup() {
		const fixture = TestBed.createComponent(GestionProyectos)
		fixture.detectChanges()
		http.expectOne(base + '/catalogs/uens').flush({ succeeded: true, data: [{ id: 8, name: 'Industrial' }] })
		http.expectOne(base + '/catalogs/tipos-producto').flush({ succeeded: true, data: [{ id: 9, name: 'Químicos' }] })
		if (central()) http.expectOne(base + '/catalogs/proveedores-productos').flush({ succeeded: true, data: [{ id: 'KEY', name: 'KEY' }] })
		await Promise.resolve()
		await Promise.resolve()
		if (central()) http.expectOne((r) => r.url === base + '/catalogs/sucursales').flush({ succeeded: true, data: [{ id: 22, name: 'Sucursal real' }] })
		await fixture.whenStable()
		return fixture
	}
	it('renders central fields without mock mode or preview', async () => {
		const f = await setup()
		const text = f.nativeElement.textContent
		expect(text).toContain('Grupo de sucursales')
		expect(text).toContain('Proveedor de productos')
		expect(text).toContain('Resumen KPIs')
		expect(text).not.toContain('Vista previa')
		expect(text).not.toContain('Vista de prueba')
		expect(f.componentInstance.filters().branches).toEqual(['22'])
	})
	it('hides central fields and scopes the report to the manager header RIK', async () => {
		central.set(false)
		manager.set(true)
		rik.set(475)
		session.set({ userId: 2, sucursalId: 22 })
		const f = await setup()
		const text = f.nativeElement.textContent
		expect(text).not.toContain('Grupo de sucursales')
		expect(text).not.toContain('Proveedor de productos')
		expect(text).not.toContain('Resumen KPIs')
		f.componentInstance.filters.update((v) => ({ ...v, branches: ['999'], supplier: 'KEY', mode: 'database' }))
		expect(f.componentInstance.query()).toMatchObject({ DownloadMode: 'all', IsManager: true, RikId: 475, SucursalesId: null, ProveedorProducto: null })
	})
	it('uses the exact Vue report contract and handles an empty file', async () => {
		const f = await setup(),
			p = f.componentInstance
		p.set('start', '2026-01')
		p.set('end', '2026-03')
		p.set('clientType', 'LD')
		p.set('stage', '3')
		p.set('category', '9')
		p.set('saleType', 'VI')
		p.set('supplier', 'KEY')
		p.set('mode', 'kpi')
		const result = p.export()
		const r = http.expectOne((r) => r.url === base + '/crm/reports/gestion-proyectos')
		expect(r.request.responseType).toBe('blob')
		for (const [key, value] of Object.entries({
			DownloadMode: 'kpi',
			StartMonth: '1',
			StartYear: '2026',
			EndMonth: '3',
			EndYear: '2026',
			IsManager: 'false',
			SucursalesId: '22',
			TipoProspecto: 'LD',
			EtapaOportunidad: '3',
			Categoria: '9',
			TipoVenta: 'VI',
			ProveedorProducto: 'KEY'
		}))
			expect(r.request.params.get(key)).toBe(value)
		expect(r.request.params.has('RikId')).toBe(false)
		r.flush(new Blob([]))
		await result
		expect(p.error()).toContain('No se encontraron registros')
		expect(p.busy()).toBe(false)
	})
	it('clears dependent segments and ignores outdated requests', async () => {
		const f = await setup(),
			p = f.componentInstance
		p.set('uen', '8')
		const old = http.expectOne((r) => r.url === base + '/catalogs/segmentos')
		p.set('uen', '9')
		const fresh = http.expectOne((r) => r.url === base + '/catalogs/segmentos')
		fresh.flush({ succeeded: true, data: [{ id: 91, name: 'Actual' }] })
		await Promise.resolve()
		old.flush({ succeeded: true, data: [{ id: 81, name: 'Anterior' }] })
		await f.whenStable()
		expect(p.segments()).toEqual([{ value: '91', label: 'Actual' }])
		expect(p.filters().segment).toBe('')
	})
	it('blocks reversed periods and empty central branch selection', async () => {
		const f = await setup(),
			p = f.componentInstance
		p.set('start', '2099-12')
		p.set('end', '2099-01')
		await p.export()
		expect(p.error()).toContain('periodo válido')
		p.set('end', '2099-12')
		p.set('branches', [])
		await p.export()
		expect(p.error()).toContain('sucursal')
		http.expectNone((r) => r.url.includes('/crm/reports'))
	})
	it('does not request catalogs without an authenticated session', async () => {
		authenticated.set(false)
		const f = TestBed.createComponent(GestionProyectos)
		await f.whenStable()
		expect(f.nativeElement.querySelector('form')).toBeNull()
		http.expectNone((r) => true)
	})
	it('reports HTTP failures separately from no data', async () => {
		const f = await setup()
		const pending = f.componentInstance.export()
		http.expectOne((r) => r.url.includes('/crm/reports')).flush(new Blob(['Error']), { status: 500, statusText: 'Server error' })
		await pending
		expect(f.componentInstance.error()).toContain('No se pudo descargar')
		expect(f.componentInstance.error()).not.toContain('No se encontraron')
	})
})
