import { TestBed } from '@angular/core/testing'
import { DashboardMockStore, currentMonth, monthIndex } from './data-access/dashboard-mock.store'
import { Dashboard } from './pages/dashboard/dashboard'
import { DashboardFilters } from './components/dashboard-filters/dashboard-filters'
import { ProgressGauge } from '@shared/ui/progress-gauge/progress-gauge'
describe('Dashboard migration', () => {
    beforeEach(() => TestBed.configureTestingModule({}))
    it('aggregates stages and sources consistently', () => {
        const s = TestBed.inject(DashboardMockStore)
        const d = s.data()
        expect(d.pipeline + d.closed).toBe(d.total)
        expect(d.sources.reduce((sum, x) => sum + x.count, 0)).toBe(d.count)
        expect(d.opportunities.length).toBe(5)
        expect(d.opportunities[0].amount).toBeGreaterThanOrEqual(d.opportunities[4].amount)
    })
    it('filters scope and preserves valid data when dates are invalid', () => {
        const s = TestBed.inject(DashboardMockStore)
        const original = s.data().total
        s.apply({ ...s.filter(), branches: ['1'], representatives: ['1'] })
        expect(s.data().total).toBeLessThan(original)
        const data = s.data()
        expect(s.apply({ ...s.filter(), start: '2026-13' })).toBe(false)
        expect(s.data()).toBe(data)
        expect(s.apply({ ...s.filter(), start: '2099-12', end: '2099-01' })).toBe(false)
    })
    it('handles no representatives and periods without data', () => {
        const s = TestBed.inject(DashboardMockStore)
        s.apply({ ...s.filter(), representatives: [] })
        expect(s.data().total).toBe(0)
        expect(s.data().stages.every((x) => x.share === 0)).toBe(true)
        expect(s.data().totalDays).toBeNull()
        s.apply({ ...s.filter(), start: '9999-01', end: '9999-02', representatives: ['1'] })
        expect(s.data().count).toBe(0)
        expect(s.data().monthCount).toBe(2)
    })
    it('keeps local and representative scopes within their branch', () => {
        const s = TestBed.inject(DashboardMockStore)
        s.apply({ ...s.filter(), mode: 'representante', branches: ['5'], representatives: ['6'] })
        expect(s.filter().branches).toEqual(['1'])
        expect(s.filter().representatives).toEqual(['1'])
        expect(s.data().total).toBeGreaterThan(0)
    })
    it('accumulates multiple months and uses the preceding quarter for comparison', () => {
        const s = TestBed.inject(DashboardMockStore)
        const month = monthIndex(currentMonth()) - 1
        const start = Math.floor(month / 12) + '-' + String((month % 12) + 1).padStart(2, '0')
        const one = s.data().total
        s.apply({ ...s.filter(), start })
        expect(s.data().monthCount).toBe(2)
        expect(s.data().total).toBeGreaterThan(one)
        expect(s.data().stages.every((x) => x.previousAmount > 0)).toBe(true)
    })
    it('resets dependent selections when the branch group changes', () => {
        const f = TestBed.createComponent(DashboardFilters).componentInstance
        f.group('4')
        expect(f.draft().branches).toEqual(['5'])
        expect(f.draft().representatives).toEqual(['6'])
        f.apply()
        expect(f.store.data().count).toBeGreaterThan(0)
    })
    it('renders the dashboard sections and empty state', async () => {
        const f = TestBed.createComponent(Dashboard)
        await f.whenStable()
        expect(f.nativeElement.querySelector('h1').textContent).toBe('Inicio')
        for (const title of [
            'Meta de cierre',
            'Cumplimiento de presupuestos',
            'Oportunidades importantes',
            'Embudo de oportunidades',
            'Estadísticas por etapa',
            'Origen de las oportunidades',
            'Tiempo por etapa',
        ])
            expect(f.nativeElement.textContent).toContain(title)
        f.componentInstance.store.apply({
            ...f.componentInstance.store.filter(),
            branches: [],
            representatives: [],
        })
        await f.whenStable()
        expect(f.nativeElement.textContent).toContain('No hay oportunidades')
        expect(f.nativeElement.textContent).not.toContain('NaN')
    })
    it('caps the gauge arc while retaining actual overachievement', async () => {
        const f = TestBed.createComponent(ProgressGauge)
        f.componentRef.setInput('goal', 100)
        f.componentRef.setInput('value', 150)
        await f.whenStable()
        expect(f.componentInstance.fill()).toBe(100)
        expect(f.nativeElement.textContent).toContain('150%')
        f.componentRef.setInput('goal', 0)
        await f.whenStable()
        expect(f.nativeElement.textContent).toContain('Sin presupuesto')
    })
})
