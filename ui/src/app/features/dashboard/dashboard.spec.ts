import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { RikFilterStore } from '@app/core/filters/rik-filter.store'
import { AuthStore } from '@app/core/auth/auth.store'
import { DashboardService } from './pages/dashboard/dashboard.service'
import { DashboardApiService } from './pages/dashboard/dashboard-api.service'
import { DashboardData } from './pages/dashboard/dashboard.model'
import { mapDashboard } from './pages/dashboard/dashboard.mapper'
import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { Dashboard } from './pages/dashboard/dashboard'

const fixture: DashboardData = {
    totalesPorEtapas: {
        analisis: 100,
        promocion: 200,
        negociacion: 300,
        embudo: 600,
        cierre: 400,
        metaMensualCierre: 500,
    },
    estadisticasPorEtapa: [
        {
            etapa: 1,
            periodo: 'TresMesesAtras',
            cantidadOportunidades: 3,
            totalVpoAlCierre: 90,
            porcentaje: 30,
        },
        {
            etapa: 1,
            periodo: 'Actual',
            cantidadOportunidades: 5,
            totalVpoAlCierre: 150,
            porcentaje: 60,
        },
    ],
    fuentes: { leads: 2, prospectos: 3 },
    oportunidadesImportantes: [],
    cumplimientoPresupuestoEmbudo: { metaMensualEmbudo: 800, totalEmbudo: 700 },
    cumplimientoPresupuestoProyectosNuevos: {
        metaMensualProyectosNuevos: 250,
        totalProyectosNuevos: 200,
    },
    tiempoPorEtapas: { etapas: [], promedioDiasTotal: 0, promedioDiasTotalTexto: '0' },
}
describe('Dashboard API migration', () => {
    const authenticated = signal(false),
        central = signal(true),
        manager = signal(false)
    let http: HttpTestingController
    beforeEach(() => {
        authenticated.set(false)
        central.set(true)
        manager.set(false)
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                DashboardService,
                {
                    provide: AuthStore,
                    useValue: {
                        isFullyAuthenticated: authenticated,
                        isCentral: central,
                        isManager: manager,
                        sucursalId: () => 10,
                        session: () => ({ sucursalId: 10 }),
                    },
                },
            ],
        })
        http = TestBed.inject(HttpTestingController)
    })
    afterEach(() => http.verify())
    it('serializes the Vue query contract and omits null scope parameters', () => {
        TestBed.inject(DashboardApiService)
            .getDashboardData({
                StartMonth: 1,
                StartYear: 2026,
                EndMonth: 3,
                EndYear: 2026,
                IsManager: false,
                RiksId: null,
                SucursalesId: null,
            })
            .subscribe()
        const req = http.expectOne((r) => r.url.endsWith('/crm/dashboard'))
        expect(req.request.params.get('StartMonth')).toBe('1')
        expect(req.request.params.get('EndMonth')).toBe('3')
        expect(req.request.params.has('RiksId')).toBe(false)
        expect(req.request.params.has('periodo')).toBe(false)
        req.flush({ succeeded: true, data: fixture })
    })
    it('uses session scope and rejects reversed dates without applying them', () => {
        const s = TestBed.inject(DashboardService)
        s.filter.set({
            start: '2026-01',
            end: '2026-03',
            group: '1',
            branches: ['10', '20'],
            representatives: ['7'],
        })
        expect(s.buildQuery()).toMatchObject({
            SucursalesId: '10,20',
            RiksId: '7',
            IsManager: false,
        })
        central.set(false)
        manager.set(true)
        expect(s.buildQuery()).toMatchObject({ SucursalesId: null, RiksId: null, IsManager: true })
        manager.set(false)
        expect(s.buildQuery()).toMatchObject({ SucursalesId: null, RiksId: null, IsManager: false })
        authenticated.set(true)
        s.updateDate('start', '2026-04')
        expect(s.apply()).toBe(false)
        expect(s.applied()).toBeNull()
    })
    it('resets dependent catalogs and ignores late responses', async () => {
        const s = TestBed.inject(DashboardService)
        const old = s.group('1'),
            current = s.group('2')
        const requests = http.match((r) => r.url.endsWith('/catalogs/sucursales'))
        requests[1].flush({
            succeeded: true,
            data: [
                { id: 20, name: 'B' },
                { id: 21, name: 'C' },
            ],
        })
        await current
        requests[0].flush({ succeeded: true, data: [{ id: 10, name: 'A' }] })
        await old
        expect(s.filter().branches).toEqual(['20', '21'])
        expect(s.reps()).toEqual([])
        const single = s.selectBranches(['20'])
        http.expectOne((r) => r.url.endsWith('/catalogs/riks')).flush({
            succeeded: true,
            data: [{ id: 7, name: 'RIK' }],
        })
        await single
        expect(s.filter().representatives).toEqual(['7'])
        await s.selectBranches(['20', '21'])
        expect(s.filter().representatives).toEqual([])
        expect(s.catalogLoading()).toBe(false)
    })
    it('maps periods independently and preserves budget totals and API statistics', () => {
        const data = mapDashboard(fixture)
        expect(data.stages[0]).toMatchObject({
            amount: 150,
            previousAmount: 90,
            count: 5,
            share: 60,
        })
        expect(data.pipeline).toBe(600)
        expect(data.pipelineBudget).toBe(700)
        expect(data.metricAmounts).toEqual([100, 200, 300])
        expect(mapDashboard(undefined).total).toBe(0)
    })
    it('loads and renders real data for an authenticated representative', async () => {
        central.set(false)
        authenticated.set(true)
        const component = TestBed.createComponent(Dashboard)
        component.detectChanges()
        await new Promise((resolve) => setTimeout(resolve, 0))
        TestBed.tick()
        http.expectOne((r) => r.url.endsWith('/crm/dashboard')).flush({
            succeeded: true,
            data: fixture,
        })
        await component.whenStable()
        component.detectChanges()
        expect(component.nativeElement.textContent).toContain('Cumplimiento de presupuestos')
        expect(component.nativeElement.textContent).toContain('No hay oportunidades')
        expect(component.nativeElement.textContent).not.toContain('Vista de prueba')
        expect(component.nativeElement.textContent).not.toContain('NaN')
    })
    it('shows API errors and retries the same query', async () => {
        central.set(false)
        authenticated.set(true)
        const component = TestBed.createComponent(Dashboard)
        component.detectChanges()
        await new Promise((resolve) => setTimeout(resolve, 0))
        TestBed.tick()
        http.expectOne((r) => r.url.endsWith('/crm/dashboard')).flush('Error', {
            status: 500,
            statusText: 'Server error',
        })
        await component.whenStable()
        component.detectChanges()
        expect(component.nativeElement.textContent).toContain('No se pudo cargar el dashboard')
        component.componentInstance.service.apply()
        TestBed.tick()
        http.expectOne((r) => r.url.endsWith('/crm/dashboard')).flush({
            succeeded: true,
            data: fixture,
        })
        await component.whenStable()
        component.detectChanges()
        expect(component.nativeElement.textContent).toContain('Cumplimiento de presupuestos')
    })
    it('does not request data before authentication', async () => {
        const component = TestBed.createComponent(Dashboard)
        component.detectChanges()
        await component.whenStable()
        http.expectNone((r) => r.url.endsWith('/crm/dashboard'))
        expect(component.componentInstance.service.apply()).toBe(false)
    })
    it('reloads the manager dashboard from the global RIK while preserving the applied dates', async () => {
        central.set(false)
        manager.set(true)
        authenticated.set(true)
        const component = TestBed.createComponent(Dashboard)
        component.detectChanges()
        await new Promise((resolve) => setTimeout(resolve, 0))
        TestBed.tick()
        http.expectOne((r) => r.url.endsWith('/catalogs/riks')).flush({
            succeeded: true,
            data: [{ id: 7, name: 'RIK 7' }],
        })
        const initial = http.expectOne((r) => r.url.endsWith('/crm/dashboard'))
        const start = initial.request.params.get('StartMonth')
        initial.flush({ succeeded: true, data: fixture })
        await component.whenStable()
        const global = TestBed.inject(RikFilterStore)
        component.componentInstance.service.updateDate('start', '2020-01')
        global.select(7)
        TestBed.tick()
        const filtered = http.expectOne((r) => r.url.endsWith('/crm/dashboard'))
        expect(filtered.request.params.get('RiksId')).toBe('7')
        expect(filtered.request.params.get('IsManager')).toBe('true')
        expect(filtered.request.params.get('StartMonth')).toBe(start)
        filtered.flush({ succeeded: true, data: fixture })
        await component.whenStable()
        global.select(null)
        TestBed.tick()
        const all = http.expectOne((r) => r.url.endsWith('/crm/dashboard'))
        expect(all.request.params.has('RiksId')).toBe(false)
        all.flush({ succeeded: true, data: fixture })
        await component.whenStable()
        expect(component.nativeElement.querySelector('select[name="rik"]')).toBeNull()
    })
    it('limits calendar selections to the valid range', () => {
        const f = TestBed.createComponent(MonthCalendar)
        f.componentRef.setInput('label', 'Desde')
        f.componentRef.setInput('value', '2026-03')
        f.componentRef.setInput('max', '2026-04')
        f.detectChanges()
        expect(f.componentInstance.disabled(4)).toBe(true)
        expect(f.componentInstance.disabled(3)).toBe(false)
        const emit = vi.spyOn(f.componentInstance.valueChange, 'emit')
        f.componentInstance.select(4)
        expect(emit).not.toHaveBeenCalled()
        f.componentInstance.select(3)
        expect(emit).toHaveBeenCalledWith('2026-04')
    })
})
