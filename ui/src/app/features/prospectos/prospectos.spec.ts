import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { UserRole } from '@core/auth/auth.model'
import { environment } from '@env/environment'
import { ProspectosApiService } from './data-access/prospectos-api.service'
import { ProspectosService, ProspectosNotice } from './data-access/prospectos.service'
import { ProspectoForm } from './components/prospecto-form/prospecto-form'
import { LeadsPicker } from './components/leads-picker/leads-picker'
import { ProspectosList } from './pages/prospectos-list/prospectos-list'
import { ProspectoPayload, ProspectoDetail, ProspectosQuery, ProspectoRow } from './models/prospecto'
const root = environment.apiUrl
const payload: ProspectoPayload = { razonSocial: 'Empresa API', contacto: null, correo: null, telefono: null, uenId: 8, segmentoId: 81, tipoClienteId: 7, territorioId: 90, vpo: 1000, observaciones: null }
const detail: ProspectoDetail = {
	prospectoId: 42,
	clienteId: 900,
	razonSocial: 'Empresa API',
	contacto: 'Ana',
	correo: 'ana@example.com',
	telefono: '6145551234',
	uenId: 8,
	uen: 'UEN real',
	segmentoId: 81,
	segmento: 'Segmento real',
	segmentoDimension: 'Unidades',
	segmentoValorDimension: 50,
	cantidadDimension: 10,
	tipoClienteId: 7,
	tipoCliente: 'Tipo real',
	vpo: 1000,
	territorioId: 90,
	territorio: 'Territorio real',
	observaciones: 'Visita',
	idLead: null,
	registro: 'Completo'
}
const query: ProspectosQuery = {
	page: 1,
	itemsPerPage: 10,
	filterMes: null,
	filterAnio: null,
	filterNombreProspecto: null,
	filterRegistro: null,
	filterFuente: null,
	filterEtapaLead: null,
	filterRik: null,
	filterEtapaOportunidad: null,
	filterEstatus: -1,
	isGte: false
}
afterEach(() => vi.useRealTimers())
describe('Prospectos API', () => {
	let http: HttpTestingController
	const session = signal({ userId: 1, sucursalId: 2, rikId: 475, role: UserRole.Rik }),
		authenticated = signal(true),
		manager = signal(false),
		rik = signal<number | null>(null)
	beforeEach(() => {
		session.set({ userId: 1, sucursalId: 2, rikId: 475, role: UserRole.Rik })
		authenticated.set(true)
		manager.set(false)
		rik.set(null)
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				ProspectosService,
				{ provide: AuthStore, useValue: { session, isFullyAuthenticated: authenticated, isCentral: () => false, isManager: manager } },
				{ provide: RikFilterStore, useValue: { selectedRikId: rik } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify({ ignoreCancelled: true }))
	it('uses exact backend query and downloads the server workbook without pagination', async () => {
		const api = TestBed.inject(ProspectosApiService)
		const pending = firstValueFrom(api.list({ ...query, filterRegistro: 0, filterEstatus: 0, isGte: true, filterRik: 476 }))
		const r = http.expectOne((r) => r.url === root + '/crm/prospectos')
		expect(r.request.params.get('filterRegistro')).toBe('0')
		expect(r.request.params.get('filterEstatus')).toBe('0')
		expect(r.request.params.get('filterRik')).toBe('476')
		r.flush({ succeeded: true, data: { totalRows: 0, prospectos: [] } })
		await pending
		const excel = firstValueFrom(api.export(query))
		const file = http.expectOne((r) => r.url === root + '/crm/prospectos/excel')
		expect(file.request.responseType).toBe('blob')
		expect(file.request.params.has('page')).toBe(false)
		file.flush(new Blob(['test']))
		await excel
	})
	it('posts and puts the declared payload and preserves partial-success messages', async () => {
		const api = TestBed.inject(ProspectosApiService)
		const add = firstValueFrom(api.save(payload, undefined, 101))
		const r = http.expectOne(root + '/crm/prospectos')
		expect(r.request.method).toBe('POST')
		expect(r.request.body).toEqual({ ...payload, idLead: 101 })
		r.flush({ succeeded: true, data: true, message: 'Creado; asociación pendiente. No repita el alta.' })
		expect(await add).toContain('No repita')
		const edit = firstValueFrom(api.save(payload, 42, 101))
		const e = http.expectOne(root + '/crm/prospectos')
		expect(e.request.method).toBe('PUT')
		expect(e.request.body).toEqual({ ...payload, prospectoId: 42 })
		e.flush({ succeeded: true, data: true })
		await edit
	})
	it('does not treat a failed API wrapper as a successful save', async () => {
		const promise = firstValueFrom(TestBed.inject(ProspectosApiService).save(payload))
		const rejected = expect(promise).rejects.toThrow('Territorio inválido')
		http.expectOne(root + '/crm/prospectos').flush({ succeeded: false, data: false, errors: ['Territorio inválido'] })
		await rejected
	})
	it('cancels obsolete queries and clears records when the session ends', async () => {
		vi.useFakeTimers()
		const service = TestBed.inject(ProspectosService)
		TestBed.tick()
		const first = http.expectOne((r) => r.url === root + '/crm/prospectos')
		service.filter('search', 'nuevo')
		TestBed.tick()
		expect(first.cancelled).toBe(true)
		vi.advanceTimersByTime(300)
		const current = http.expectOne((r) => r.url === root + '/crm/prospectos')
		current.flush({ succeeded: true, data: { totalRows: 31, prospectos: [] } })
		expect(service.total()).toBe(31)
		authenticated.set(false)
		TestBed.tick()
		expect(service.rows()).toEqual([])
		expect(service.total()).toBe(0)
		http.expectNone(root + '/crm/prospectos')
	})
	it('uses the manager RIK filter and disables editing', () => {
		manager.set(true)
		session.update((s) => ({ ...s, role: UserRole.Manager }))
		rik.set(476)
		const service = TestBed.inject(ProspectosService)
		TestBed.tick()
		const r = http.expectOne((r) => r.url === root + '/crm/prospectos')
		expect(r.request.params.get('isGte')).toBe('true')
		expect(r.request.params.get('filterRik')).toBe('476')
		expect(service.canEdit()).toBe(false)
		r.flush({ succeeded: true, data: { totalRows: 0, prospectos: [] } })
	})
	it('loads detail and catalogs, saves IDs and omits unsupported demo fields', async () => {
		const f = TestBed.createComponent(ProspectoForm)
		f.componentRef.setInput('prospectoId', 42)
		f.detectChanges()
		http.expectOne(root + '/catalogs/uens').flush({ succeeded: true, data: [{ id: 8, name: 'UEN real' }] })
		http.expectOne(root + '/catalogs/tipos-cliente').flush({ succeeded: true, data: [{ id: 7, name: 'Tipo real' }] })
		http.expectOne(root + '/catalogs/territorios').flush({ succeeded: true, data: [{ id: 90, name: 'Territorio real' }] })
		await Promise.resolve()
		http.expectOne(root + '/crm/prospectos/42').flush({ succeeded: true, data: detail })
		await Promise.resolve()
		http.expectOne((r) => r.url === root + '/catalogs/segmentos' && r.params.get('uenId') === '8').flush({ succeeded: true, data: [{ id: 81, name: 'Segmento real' }] })
		await f.whenStable()
		expect(f.componentInstance.form.controls.razonSocial.value).toBe('Empresa API')
		const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
		const save = f.componentInstance.save()
		const r = http.expectOne(root + '/crm/prospectos')
		expect(r.request.body.prospectoId).toBe(42)
		expect(r.request.body.territorioId).toBe(90)
		expect(r.request.body).not.toHaveProperty('cantidadDimension')
		expect(r.request.body).not.toHaveProperty('estatus')
		r.flush({ succeeded: true, data: true })
		await save
		expect(nav).toHaveBeenCalledWith('/prospectos')
		expect(TestBed.inject(ProspectosNotice).message()).toContain('actualizado')
	})
	it('has no fixture catalogs or requests when access is unavailable', async () => {
		authenticated.set(false)
		const f = TestBed.createComponent(ProspectoForm)
		await f.whenStable()
		expect(f.componentInstance.uens()).toEqual([])
		expect(f.nativeElement.querySelector('form')).toBeNull()
		http.expectNone((r) => true)
	})
	it('loads real leads and sends the rejection contract', async () => {
		const f = TestBed.createComponent(LeadsPicker)
		f.detectChanges()
		const r = http.expectOne((r) => r.url === root + '/crm/leads/suggestions')
		expect(r.request.params.get('itemsPerPage')).toBe('4')
		expect(r.request.params.has('rikId')).toBe(false)
		r.flush({ succeeded: true, data: { leads: [{ id: 101, empresa: 'Sugerencia real', contacto: 'Ana' }], totalRows: 1 } })
		expect(f.componentInstance.rows()[0].empresa).toBe('Sugerencia real')
		expect(f.componentInstance.rows()[0].estado).toBe('Disponible')
		f.componentInstance.rejecting.set(101)
		f.componentInstance.reason.set('Duplicado')
		const save = f.componentInstance.reject()
		const rejected = http.expectOne(root + '/crm/leads/101/reject')
		expect(rejected.request.body).toEqual({ leadId: 101, rejectionReasonId: 3, rejectionComment: 'Duplicado' })
		rejected.flush({ succeeded: true, data: true })
		await save
		http.expectOne((r) => r.url === root + '/crm/leads/suggestions').flush({ succeeded: true, data: { leads: [], totalRows: 0 } })
	})
	it('opens detail by prospect ID when the customer ID differs', async () => {
		const f = TestBed.createComponent(ProspectosList)
		f.detectChanges()
		http.expectOne((r) => r.url === root + '/crm/prospectos').flush({ succeeded: true, data: { prospectos: [], totalRows: 0 } })
		const pending = f.componentInstance.openDetail({ id: 42, clienteId: 900 } as ProspectoRow)
		http.expectOne(root + '/crm/prospectos/42').flush({ succeeded: true, data: detail })
		await pending
		expect(f.componentInstance.detail()?.prospectoId).toBe(42)
	})
	it('sends the selected rejection type without requiring text for standard reasons', async () => {
		const f = TestBed.createComponent(LeadsPicker)
		f.detectChanges()
		http.expectOne((r) => r.url === root + '/crm/leads/suggestions').flush({ succeeded: true, data: { leads: [], totalRows: 0 } })
		f.componentInstance.rejecting.set(101)
		f.componentInstance.reasonType.set(2)
		const pending = f.componentInstance.reject()
		const request = http.expectOne(root + '/crm/leads/101/reject')
		expect(request.request.body).toEqual({ leadId: 101, rejectionReasonId: 2, rejectionComment: '' })
		request.flush({ succeeded: true, data: true })
		await pending
		http.expectOne((r) => r.url === root + '/crm/leads/suggestions').flush({ succeeded: true, data: { leads: [], totalRows: 0 } })
	})
})
