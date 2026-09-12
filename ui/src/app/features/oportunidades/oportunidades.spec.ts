import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { environment } from '@env/environment'
import { OportunidadesApiService } from './data-access/oportunidades-api.service'
import { EmbudoList } from './pages/embudo-list/embudo-list'
import { ProductosEditor } from './components/productos-editor/productos-editor'
import { ProyectoForm } from './components/proyecto-form/proyecto-form'
import { Proyecto } from './models/oportunidad'
import { ProspectoDetail } from '@features/prospectos/models/prospecto'
const root = environment.apiUrl + '/crm/oportunidades'
const project: Proyecto = {
	idOportunidad: 81,
	idCliente: 123,
	cliente: 'Cliente real',
	tipoVenta: 1,
	vpo: 100,
	vpt: 200,
	etapa: 1,
	idArea: 8,
	area: 'Área',
	idSolucion: 9,
	solucion: 'Solución',
	idAplicacion: 10,
	aplicacion: 'Aplicación',
	montoProyecto: 0,
	productos: []
}
afterEach(() => vi.useRealTimers())
describe('Oportunidades con API real', () => {
	let http: HttpTestingController
	const authenticated = signal(true),
		manager = signal(false),
		rik = signal<number | null>(null)
	const session = signal({ userId: 1, sucursalId: 110, role: UserRole.Rik })
	beforeEach(() => {
		authenticated.set(true)
		manager.set(false)
		rik.set(null)
		session.set({ userId: 1, sucursalId: 110, role: UserRole.Rik })
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: AuthStore, useValue: { isFullyAuthenticated: authenticated, isCentral: () => false, isManager: manager, session } },
				{ provide: RikFilterStore, useValue: { selectedRikId: rik } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify({ ignoreCancelled: true }))
	it('sends server paging and filters and exports without pagination', async () => {
		const api = TestBed.inject(OportunidadesApiService),
			q = { isGte: true, page: 3, itemsPerPage: 20, filterRik: 476, filterNombreEmpresa: 'Empresa & hijos', filterEtapa: 2 }
		const pending = firstValueFrom(api.embudo(q))
		const r = http.expectOne((r) => r.url === root + '/embudo')
		expect(r.request.params.get('filterNombreEmpresa')).toBe('Empresa & hijos')
		expect(r.request.params.get('filterRik')).toBe('476')
		expect(r.request.params.get('page')).toBe('3')
		r.flush({ succeeded: true, data: { totalRows: 0, oportunidades: [] } })
		await pending
		const download = firstValueFrom(api.export(q))
		const file = http.expectOne((r) => r.url === root + '/excel')
		expect(file.request.params.has('page')).toBe(false)
		expect(file.request.responseType).toBe('blob')
		file.flush(new Blob(['file']))
		await download
	})

	it('shows the Vue funnel columns and puts each amount in its matching stage', async () => {
		const f = TestBed.createComponent(EmbudoList)
		f.detectChanges()
		http.expectOne((r) => r.url === root + '/embudo').flush({
			succeeded: true,
			data: {
				totalRows: 4,
				oportunidades: [1, 2, 3, 4].map((etapa) => ({
					idOportunidad: etapa,
					cliente: 'Empresa',
					aplicacion: 'Aplicación',
					fuente: 'LD',
					etapa,
					vpo: 100,
					vpt: 200,
					integralidad: '20%',
					vpmAntesCierre: etapa * 1000,
					acys: 0,
					facturacion: 0,
					detalle: { productos: [], fechaRegistro: '2026-09-11', duracionProyecto: '1 día' }
				}))
			}
		})
		f.detectChanges()
		await f.whenStable()
		const table = f.nativeElement.querySelector('table')
		expect(table.querySelectorAll('thead th')).toHaveLength(14)
		expect(Array.from(table.querySelectorAll('thead abbr')).map((e: any) => e.textContent.trim())).toEqual(['A', 'P', 'N', 'C'])
		Array.from(table.querySelectorAll('tbody tr')).forEach((row: any, index) => {
			const cells = row.querySelectorAll('td')
			for (let stage = 0; stage < 4; stage++) {
				expect(cells[7 + stage].textContent.trim().length > 0).toBe(stage === index)
			}
		})
	})
	it('uses the customer ID for project queries', async () => {
		const pending = firstValueFrom(TestBed.inject(OportunidadesApiService).proyectos(123, 2, 5))
		const r = http.expectOne((r) => r.url === root)
		expect(r.request.params.get('clienteId')).toBe('123')
		r.flush({ succeeded: true, data: { totalRows: 0, proyectos: [] } })
		await pending
	})
	it('rejects unsuccessful wrappers instead of presenting empty success', async () => {
		const pending = firstValueFrom(TestBed.inject(OportunidadesApiService).close(81))
		const rejected = expect(pending).rejects.toThrow('Hay precios pendientes')
		http.expectOne(root + '/cerrar-oportunidad').flush({ succeeded: false, data: false, errors: ['Hay precios pendientes'] })
		await rejected
	})
	it('cancels obsolete funnel requests and clears data on logout', () => {
		vi.useFakeTimers()
		const f = TestBed.createComponent(EmbudoList)
		f.detectChanges()
		const first = http.expectOne((r) => r.url === root + '/embudo')
		f.componentInstance.filter('search', 'nuevo')
		TestBed.tick()
		expect(first.cancelled).toBe(true)
		vi.advanceTimersByTime(300)
		http.expectOne((r) => r.url === root + '/embudo').flush({ succeeded: true, data: { totalRows: 17, oportunidades: [] } })
		expect(f.componentInstance.total()).toBe(17)
		authenticated.set(false)
		TestBed.tick()
		expect(f.componentInstance.total()).toBe(0)
		expect(f.componentInstance.rows()).toEqual([])
	})
	it('uses manager RIK selection and prevents mutation controls', () => {
		manager.set(true)
		session.update((s) => ({ ...s, role: UserRole.Manager }))
		rik.set(476)
		const f = TestBed.createComponent(EmbudoList)
		f.detectChanges()
		const r = http.expectOne((r) => r.url === root + '/embudo')
		expect(r.request.params.get('isGte')).toBe('true')
		expect(r.request.params.get('filterRik')).toBe('476')
		expect(f.componentInstance.canEdit()).toBe(false)
		r.flush({ succeeded: true, data: { totalRows: 0, oportunidades: [] } })
	})
	it('loads applications from the server and saves selected IDs', async () => {
		const f = TestBed.createComponent(ProyectoForm)
		f.componentRef.setInput('client', { prospectoId: 42, clienteId: 123, segmentoId: 7, territorioId: 90, cantidadDimension: 10, segmentoValorDimension: 50 } as ProspectoDetail)
		f.detectChanges()
		http.expectOne((r) => r.url === root + '/catalogos/areas').flush({ succeeded: true, data: [{ id: 8, name: 'Área' }] })
		await f.whenStable()
		f.componentInstance.area = 8
		const area = f.componentInstance.changeArea()
		http.expectOne((r) => r.url === root + '/catalogos/soluciones').flush({ succeeded: true, data: [{ id: 9, name: 'Solución' }] })
		await area
		f.componentInstance.solution = 9
		const sol = f.componentInstance.changeSolution()
		http.expectOne((r) => r.url === root + '/catalogos/aplicaciones').flush({ succeeded: true, data: [{ id: 10, name: 'Aplicación', activo: true, potencial: 40 }] })
		await sol
		const app = f.componentInstance.apps()[0]
		app.selected = true
		app.vpo = 120
		expect(f.componentInstance.vpt(app)).toBe(200)
		const saved = f.componentInstance.save(false)
		const r = http.expectOne(root)
		expect(r.request.body).toEqual({ idProspecto: 42, idCliente: 123, idTerritorio: 90, idArea: 8, idSolucion: 9, tipoVenta: 1, aplicaciones: [{ idAplicacion: 10, vpo: 120 }] })
		r.flush({ succeeded: true, data: [{ idOportunidad: 81, idAplicacion: 10 }] })
		await saved
	})
	it('uses server price validation and submits an authorization request', async () => {
		const f = TestBed.createComponent(ProductosEditor)
		f.componentRef.setInput('project', project)
		f.componentRef.setInput('segmentId', 7)
		f.detectChanges()
		f.componentInstance.add({ id: 700, name: 'Producto real', img: null, categoria: null, precioObjetivo: 80, precioLista: 100 })
		f.componentInstance.products()[0].precioVenta = 60
		const save = f.componentInstance.save()
		const request = http.expectOne(root)
		expect(request.request.body.proyectos[0].productos[0].sku).toBe(700)
		request.flush({
			succeeded: true,
			data: {
				estatus: false,
				proyectos: [
					{ idOportunidad: 81, estatus: false, productos: [{ id: 700, descripcion: 'Producto real', cantidad: 1, precioVentaIngresado: 60, precioVentaMinimoRik: 70, requiereValidacion: true, fechaVigencia: '2027-09-10T00:00:00' }] }
				]
			}
		})
		await save
		expect(f.componentInstance.validation().length).toBe(1)
		const p = f.componentInstance.validation()[0]
		p.motivo = 4
		p.justificacion = 'Competencia'
		const auth = f.componentInstance.authorize()
		const r = http.expectOne(root + '/solicitar-precios')
		expect(r.request.body.proyectos[0].productos[0].motivo).toBe(4)
		r.flush({ succeeded: true, data: true })
		await auth
	})
	it('does not edit products while an authorization is pending', () => {
		const f = TestBed.createComponent(ProductosEditor)
		f.componentRef.setInput('project', { ...project, productos: [{ sku: 700, estatusAutorizacion: true }] })
		f.componentRef.setInput('segmentId', 7)
		f.detectChanges()
		expect(f.componentInstance.editable()).toBe(false)
		void f.componentInstance.save()
		http.expectNone(root)
	})
	it('uploads Excel as multipart data for server validation', async () => {
		const file = new File(['xlsx'], 'productos.xlsx')
		const pending = firstValueFrom(TestBed.inject(OportunidadesApiService).importProducts(file, 7))
		const r = http.expectOne(root + '/importar-productos')
		expect(r.request.body instanceof FormData).toBe(true)
		expect(r.request.body.get('idSeg')).toBe('7')
		r.flush({ succeeded: true, data: [] })
		await pending
	})
})
