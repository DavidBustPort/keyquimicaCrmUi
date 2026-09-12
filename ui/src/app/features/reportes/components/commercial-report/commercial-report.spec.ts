import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { CommercialReport } from './commercial-report'
import { ReportesApiService } from '@features/reportes/data-access/reportes-api.service'

describe('Reportes migrados', () => {
	const central = signal(false),
		manager = signal(false),
		authenticated = signal(true),
		rik = signal<number | null>(7)
	let http: HttpTestingController
	beforeEach(() => {
		central.set(false)
		manager.set(false)
		authenticated.set(true)
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthStore, useValue: { isCentral: central, isManager: manager, isFullyAuthenticated: authenticated, session: () => ({ userId: 1 }) } },
				{ provide: RikFilterStore, useValue: { selectedRikId: rik } }
			]
		})
		http = TestBed.inject(HttpTestingController)
	})
	afterEach(() => http.verify())
	it('renders tracking filters, only one calendar and no branch picker for RIK', async () => {
		const f = TestBed.createComponent(CommercialReport)
		f.componentRef.setInput('kind', 'tracking-cerrados')
		f.detectChanges()
		http.expectOne((r) => r.url.endsWith('/catalogs/tipos-producto')).flush({ succeeded: true, data: [{ id: 1, name: 'Químicos' }] })
		await f.whenStable()
		f.detectChanges()
		expect(f.nativeElement.querySelectorAll('app-month-calendar')).toHaveLength(1)
		expect(f.nativeElement.querySelector('select[name="branch"]')).toBeNull()
		expect(f.componentInstance.query().IdRik).toBeNull()
	})
	it('renders central prospection range and maps the selected branch', async () => {
		central.set(true)
		const f = TestBed.createComponent(CommercialReport)
		f.componentRef.setInput('kind', 'prospeccion')
		f.detectChanges()
		http.expectOne((r) => r.url.endsWith('/catalogs/sucursales')).flush({ succeeded: true, data: [{ id: 110, name: 'Sucursal' }] })
		await f.whenStable()
		f.detectChanges()
		expect(f.nativeElement.querySelectorAll('app-month-calendar')).toHaveLength(2)
		expect(f.nativeElement.querySelector('select[name="category"]')).toBeNull()
		f.componentInstance.set('branch', '110')
		f.componentInstance.set('start', '2026-01')
		f.componentInstance.set('end', '2026-08')
		expect(f.componentInstance.query()).toMatchObject({ SucursalId: 110, MesInicio: 1, MesFinal: 8, IdRik: null })
	})
	it('rejects reversed periods without issuing an export', async () => {
		const f = TestBed.createComponent(CommercialReport)
		f.componentRef.setInput('kind', 'prospeccion')
		f.detectChanges()
		await f.whenStable()
		await f.componentInstance.loadCatalogs()
		f.componentInstance.set('start', '2026-08')
		f.componentInstance.set('end', '2026-01')
		await f.componentInstance.export()
		expect(f.componentInstance.error()).toContain('periodo válido')
		http.expectNone((r) => r.url.includes('/crm/reports/'))
	})
	it('sends report filters and surfaces the new API failure body', async () => {
		const api = TestBed.inject(ReportesApiService)
		const pending = firstValueFrom(api.downloadReport('tracking-cerrados', { Mes: 8, Anio: 2026, IsGte: true, IdRik: 7, Categoria: null }))
		const rejected = expect(pending).rejects.toThrow('No hay datos')
		const request = http.expectOne((r) => r.url.endsWith('/crm/reports/tracking-cerrados'))
		expect(request.request.params.get('Mes')).toBe('8')
		expect(request.request.params.has('Categoria')).toBe(false)
		request.flush(new Blob([JSON.stringify({ succeeded: false, errors: ['No hay datos'] })], { type: 'application/json' }), { status: 400, statusText: 'Bad Request' })
		await rejected
	})
})
