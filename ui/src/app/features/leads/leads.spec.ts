import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { AuthStore } from '@app/core/auth/auth.store'
import { RikFilterStore } from '@app/core/filters/rik-filter.store'
import { routeAccessGuard } from '@app/core/auth/route-access.guard'
import { LeadsService } from './data-access/leads.service'
import { Leads } from './pages/leads/leads'
import { LeadDto, mapLead } from './models/leads-api.model'
import { LeadAssignment } from './components/lead-assignment/lead-assignment'
import { AppSidebar } from '@app/core/layout/app-sidebar/app-sidebar'
import { LeadDetail } from './components/lead-detail/lead-detail'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'

const lead: LeadDto = {
	id: 42,
	nombreEmpresa: 'Cliente real',
	productoInteres: 'Detergente',
	fechaAlta: '2026-09-10',
	giroEmpresa: 'Industria',
	estatusId: 3,
	estatus: 'Asignado al RIK',
	comentarios: 'Solicita información',
	ciudad: 'Chihuahua',
	correo: 'contacto@example.com',
	telefono: '6141234567',
	nombreContacto: 'Contacto',
	rik: 7,
	cdId: 10,
	cd: 'Sucursal 10',
	fuente: 'Web'
}
afterEach(() => vi.useRealTimers())
describe('Leads API migration', () => {
	const authenticated = signal(true),
		central = signal(false),
		manager = signal(false),
		rik = signal<number | null>(null)
	let http: HttpTestingController
	beforeEach(() => {
		authenticated.set(true)
		central.set(false)
		manager.set(false)
		rik.set(null)
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				LeadsService,
				{
					provide: AuthStore,
					useValue: {
						isFullyAuthenticated: authenticated,
						isCentral: central,
						isManager: manager,
						mode: () => (central() ? 'central' : 'sucursal'),
						session: () => ({ userId: 1, sucursalId: central() ? null : 10 })
					}
				},
				{ provide: RikFilterStore, useValue: { selectedRikId: rik } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify())
	function list() {
		return http.expectOne((r) => r.url.endsWith('/crm/leads'))
	}
	function start() {
		const s = TestBed.inject(LeadsService)
		TestBed.tick()
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 21 } })
		return s
	}
	it('loads server rows and uses server pagination and search', () => {
		vi.useFakeTimers()
		const s = start()
		expect(s.leads()[0].empresa).toBe('Cliente real')
		expect(s.total()).toBe(21)
		s.setPage(2)
		const page = list()
		expect(page.request.params.get('page')).toBe('2')
		page.flush({ succeeded: true, data: { data: [lead], totalRows: 21 } })
		s.setSearch('A&B')
		vi.advanceTimersByTime(300)
		const search = list()
		expect(search.request.params.get('filter')).toBe('A&B')
		expect(search.request.params.get('page')).toBe('1')
		search.flush({ succeeded: true, data: { data: [], totalRows: 0 } })
		s.setSize(25)
		const size = list()
		expect(size.request.params.get('itemsPerPage')).toBe('25')
		size.flush({ succeeded: true, data: { data: [], totalRows: 0 } })
	})
	it('cancels stale searches and recovers from errors', () => {
		vi.useFakeTimers()
		const s = start()
		s.setSearch('old')
		vi.advanceTimersByTime(300)
		const old = list()
		s.setSearch('new')
		vi.advanceTimersByTime(300)
		expect(old.cancelled).toBe(true)
		list().flush('Error', { status: 500, statusText: 'Server error' })
		expect(s.error()).toBeTruthy()
		expect(s.isLoading()).toBe(false)
		s.refresh()
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		expect(s.error()).toBe('')
		expect(s.leads().length).toBe(1)
	})
	it('reloads with global RIK only for managers and resets pagination', () => {
		manager.set(true)
		const s = start()
		s.setPage(2)
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 21 } })
		rik.set(7)
		TestBed.tick()
		const filtered = list()
		expect(filtered.request.params.get('rikId')).toBe('7')
		expect(filtered.request.params.get('isManager')).toBe('true')
		expect(filtered.request.params.get('page')).toBe('1')
		filtered.flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		manager.set(false)
		TestBed.tick()
		const own = list()
		expect(own.request.params.has('rikId')).toBe(false)
		own.flush({ succeeded: true, data: { data: [], totalRows: 0 } })
	})
	it('blocks central and unauthenticated access without making API calls', () => {
		central.set(true)
		const s = TestBed.inject(LeadsService)
		TestBed.tick()
		expect(s.allowed()).toBe(false)
		const sidebar = TestBed.createComponent(AppSidebar)
		sidebar.detectChanges()
		expect(sidebar.nativeElement.querySelector('a[href="/leads"]')).toBeNull()
		const route = { data: { modes: ['sucursal'] } } as unknown as ActivatedRouteSnapshot
		const check = () => TestBed.runInInjectionContext(() => routeAccessGuard(route, {} as RouterStateSnapshot))
		expect(TestBed.inject(Router).serializeUrl(check() as any)).toBe('/no-access')
		central.set(false)
		authenticated.set(false)
		TestBed.tick()
		expect(check()).not.toBe(true)
		authenticated.set(true)
		expect(check()).toBe(true)
	})
	it('posts the Vue action payloads and reloads after success', async () => {
		manager.set(true)
		const s = start()
		s.branches.set([{ id: 20, name: 'Otra sucursal' }])
		s.reps.set([{ id: 7, name: 'RIK' }])
		let task = s.changeBranch(42, '20')
		let req = http.expectOne((r) => r.url.endsWith('/42/update-sucursal'))
		expect(req.request.method).toBe('PUT')
		expect(req.request.body).toEqual({ leadId: 42, sucursalId: 20 })
		req.flush({ succeeded: true, data: true })
		await task
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		task = s.assign(42, '7')
		req = http.expectOne((r) => r.url.endsWith('/42/assign-rik'))
		expect(req.request.body).toEqual({ leadId: 42, rikId: 7 })
		req.flush({ succeeded: true, data: true })
		await task
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		task = s.reject(42, 3, '  Otro motivo  ')
		req = http.expectOne((r) => r.url.endsWith('/42/reject'))
		expect(req.request.body).toEqual({ leadId: 42, tipoRechazoId: 3, motivo: 'Otro motivo' })
		req.flush({ succeeded: true, data: true })
		await task
		list().flush({ succeeded: true, data: { data: [], totalRows: 0 } })
	})
	it('rejects forbidden actions and invalid reasons; leaves failed changes visible', async () => {
		const s = start()
		await expect(s.reject(42, 2, '')).rejects.toThrow('gerente')
		manager.set(true)
		TestBed.tick()
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		await expect(s.reject(42, 3, '  ')).rejects.toThrow('motivo')
		await expect(s.reject(42, 8, '')).rejects.toThrow('tipo')
		s.selectedId.set(42)
		const task = s.reject(42, 2, '')
		const outcome = expect(task).rejects.toThrow()
		const req = http.expectOne((r) => r.url.endsWith('/42/reject'))
		expect(req.request.body.motivo).toBeNull()
		req.flush({ succeeded: true, data: false })
		await outcome
		expect(s.selectedId()).toBe(42)
		expect(s.saving()).toBe(false)
	})
	it('uses real catalogs in the assignment form and awaits saving', async () => {
		manager.set(true)
		start()
		const f = TestBed.createComponent(LeadAssignment)
		f.componentRef.setInput('lead', mapLead(lead))
		f.componentRef.setInput('mode', 'representante')
		f.detectChanges()
		http.expectOne((r) => r.url.endsWith('/catalogs/riks')).flush({
			succeeded: true,
			data: [{ id: 7, name: 'RIK real' }]
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		await f.whenStable()
		expect(f.componentInstance.options()[0].label).toContain('RIK real')
		f.componentInstance.selection.setValue('7')
		const emitted = vi.spyOn(f.componentInstance.saved, 'emit')
		const pending = f.componentInstance.save()
		expect(emitted).not.toHaveBeenCalled()
		http.expectOne((r) => r.url.endsWith('/42/assign-rik')).flush({
			succeeded: true,
			data: true
		})
		await pending
		expect(emitted).toHaveBeenCalled()
		list().flush({ succeeded: true, data: { data: [], totalRows: 0 } })
	})
	it('renders API data and hides manager actions for representatives', async () => {
		const f = TestBed.createComponent(Leads)
		f.detectChanges()
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		await f.whenStable()
		expect(f.nativeElement.textContent).toContain('Cliente real')
		expect(f.nativeElement.textContent).not.toContain('demostración')
		const detail = TestBed.createComponent(LeadDetail)
		detail.componentRef.setInput('lead', mapLead(lead))
		detail.detectChanges()
		list().flush({ succeeded: true, data: { data: [lead], totalRows: 1 } })
		await detail.whenStable()
		expect(detail.nativeElement.textContent).not.toContain('Asignar RIK')
		expect(detail.nativeElement.textContent).toContain('Sucursal 10')
	})
	it('keeps status labels and distinguishes deleted leads', () => {
		expect(mapLead({ ...lead, estatusId: 6, estatus: 'Eliminado' })).toMatchObject({
			estado: 'Eliminado',
			estatus: 'Eliminado'
		})
	})
})
