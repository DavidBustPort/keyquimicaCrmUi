import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { environment } from '@env/environment'
import { Integralidad } from './pages/integralidad/integralidad'
import { groupClients, normalizeRow } from './models/integralidad'
const base = environment.apiUrl
const raw = { Id_Cte: 12, Cliente: 'Cliente API', Id_Apl: 20, Apl_Descripcion: 'Jabón', Venta: 100, VPT: 1000, PorcentajeAplicacion: 10, Id_Usu: 45 }
describe('Integralidad', () => {
	const session = signal({ role: UserRole.Rik }),
		manager = signal(false)
	let http: HttpTestingController
	beforeEach(() => {
		session.set({ role: UserRole.Rik })
		manager.set(false)
		HTMLDialogElement.prototype.showModal = function () {
			this.open = true
		}
		HTMLDialogElement.prototype.close = function () {
			this.open = false
		}
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthStore, useValue: { session, isFullyAuthenticated: signal(true), isCentral: signal(false), isManager: manager } },
				{ provide: RikFilterStore, useValue: { selectedRikId: signal(null) } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify({ ignoreCancelled: true }))
	function setup() {
		const f = TestBed.createComponent(Integralidad)
		f.detectChanges()
		http.expectOne(base + '/catalogs/uens').flush({ succeeded: true, data: [] })
		const request = http.expectOne((r) => r.url === base + '/crm/integralidad')
		return { f, request }
	}
	it('normalizes SQL fields and preserves weighted application coverage', () => {
		const clients = groupClients([normalizeRow(raw), normalizeRow({ ...raw, Id_Apl: 21, Apl_Descripcion: 'Pisos', Venta: 0, PorcentajeAplicacion: 90 })])
		expect(clients[0].integralidad).toBe(10)
		expect(clients[0].potential).toBe(90)
		expect(clients[0].applications[0].coverage).toBe(10)
	})
	it('averages application weight between representatives and excludes sold apps from potential', () => {
		const c = groupClients([normalizeRow(raw), normalizeRow({ ...raw, Id_Usu: 46 }), normalizeRow({ ...raw, Id_Usu: 47, Venta: 0 })])[0]
		expect(c.integralidad).toBe(10)
		expect(c.potential).toBe(0)
		expect(c.sale).toBe(200)
	})
	it('cancels the previous query and hides pagination during loading', () => {
		const { f, request } = setup()
		expect(f.nativeElement.querySelector('app-pagination')).toBeNull()
		expect(f.nativeElement.querySelector('app-table-loading')).not.toBeNull()
		f.componentInstance.apply()
		expect(request.cancelled).toBe(true)
		http.expectOne((r) => r.url === base + '/crm/integralidad').flush({ succeeded: true, data: { rows: [raw], totals: [] } })
		f.detectChanges()
		expect(f.nativeElement.textContent).toContain('Cliente API')
		expect(f.nativeElement.querySelector('app-pagination')).not.toBeNull()
	})
	it('filters customers locally without extra API requests', () => {
		const { f, request } = setup()
		request.flush({ succeeded: true, data: { rows: [raw], totals: [] } })
		f.componentInstance.filterClient('inexistente')
		expect(f.componentInstance.filtered()).toHaveLength(0)
		f.componentInstance.filterClient('12')
		expect(f.componentInstance.filtered()).toHaveLength(1)
	})
	it('prevents editing historical periods and manager sessions', async () => {
		const { f, request } = setup()
		request.flush({ succeeded: true, data: { rows: [raw], totals: [] } })
		const c = f.componentInstance
		c.edit(c.clients()[0])
		c.applied.update((q) => ({ ...q!, Year: 2020 }))
		expect(c.editable()).toBe(false)
		await c.save()
		c.applied.update((q) => ({ ...q!, Year: new Date().getFullYear(), Month: new Date().getMonth() + 1 }))
		session.set({ role: UserRole.Manager })
		expect(c.editable()).toBe(false)
	})
	it('displays API failures without mocked results', () => {
		const { f, request } = setup()
		request.flush({}, { status: 500, statusText: 'Error' })
		f.detectChanges()
		expect(f.componentInstance.rows()).toEqual([])
		expect(f.nativeElement.textContent).toContain('No se pudo cargar la integralidad')
	})
})
