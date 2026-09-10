import { TestBed } from '@angular/core/testing'
import { GestionProyectos } from './pages/gestion-proyectos/gestion-proyectos'
import { defaults, filterRows, mockRows } from './data-access/reportes-mock'
import { buildReportWorkbook } from './data-access/report-export'
describe('Reportes migrated from crm-ui', () => {
    beforeEach(() => TestBed.configureTestingModule({}))
    it('applies every additional field to the exported dataset', () => {
        const rows = mockRows()
        const sample = filterRows(rows, defaults())[0]
        for (const key of [
            'clientType',
            'stage',
            'category',
            'uen',
            'segment',
            'saleType',
            'supplier',
        ] as const) {
            const filtered = filterRows(rows, { ...defaults(), [key]: sample[key] })
            expect(filtered.length).toBeGreaterThan(0)
            expect(filtered.every((r) => r[key] === sample[key])).toBe(true)
            expect(filtered.length).toBeLessThan(filterRows(rows, defaults()).length)
        }
    })
    it('limits local and representative scopes and handles no selected branches', () => {
        const rows = mockRows()
        expect(filterRows(rows, { ...defaults(), branches: [] })).toEqual([])
        expect(
            filterRows(rows, {
                ...defaults(),
                view: 'representante',
                branches: ['5'],
                representative: '6',
            }).every((r) => r.branch === '1' && r.representative === '1'),
        ).toBe(true)
        expect(
            filterRows(rows, { ...defaults(), view: 'gerente' }).every((r) => r.branch === '1'),
        ).toBe(true)
    })
    it('resets dependent selections and restores defaults', () => {
        const p = TestBed.createComponent(GestionProyectos).componentInstance
        p.set('uen', '1')
        p.set('segment', '1')
        p.set('uen', '2')
        expect(p.filters().segment).toBe('')
        expect(p.segments().every((s) => s.uen === '2')).toBe(true)
        p.set('representative', '1')
        p.set('group', '4')
        expect(p.filters().branches).toEqual(['5'])
        expect(p.filters().representative).toBe('')
        expect(p.rows().length).toBeGreaterThan(0)
        p.reset()
        expect(p.filters()).toEqual(defaults())
        expect(p.dirty()).toBe(false)
    })
    it('blocks invalid periods and empty downloads', () => {
        const p = TestBed.createComponent(GestionProyectos).componentInstance
        p.set('start', '9999-12')
        p.export()
        expect(p.error()).toContain('periodo válido')
        p.set('end', '9999-12')
        p.export()
        expect(p.error()).toContain('No se encontraron registros')
        p.reset()
        expect(p.error()).toBe('')
    })
    it('generates valid workbooks with correct sheets, extra fields and numeric totals', () => {
        const rows = filterRows(mockRows(), defaults())
        const parse = (mode: 'all' | 'kpi' | 'database') =>
            new DOMParser().parseFromString(buildReportWorkbook(rows, mode), 'application/xml')
        expect(parse('all').querySelector('parsererror')).toBeNull()
        expect(parse('all').getElementsByTagName('Worksheet').length).toBe(2)
        expect(parse('kpi').getElementsByTagName('Worksheet').length).toBe(1)
        expect(parse('database').getElementsByTagName('Worksheet').length).toBe(1)
        const data = parse('database').documentElement.textContent!
        for (const field of ['Categoría', 'UEN', 'Segmento', 'Tipo de venta', 'Proveedor'])
            expect(data).toContain(field)
        expect(parse('database').getElementsByTagName('Row').length).toBe(rows.length + 1)
        expect(parse('kpi').documentElement.textContent).toContain(
            String(rows.reduce((sum, r) => sum + r.amount, 0)),
        )
    })
    it('escapes workbook values as text without spreadsheet formulas', () => {
        const row = { ...mockRows()[0], client: '=SUM(1,2) & <cliente>' }
        const xml = buildReportWorkbook([row], 'database')
        const doc = new DOMParser().parseFromString(xml, 'application/xml')
        expect(doc.querySelector('parsererror')).toBeNull()
        expect(doc.documentElement.textContent).toContain(row.client)
        expect(xml).not.toContain('ss:Formula')
    })
    it('renders all extra fields and updates the preview', async () => {
        const f = TestBed.createComponent(GestionProyectos)
        await f.whenStable()
        for (const field of [
            'Tipo de cliente / prospecto',
            'Etapa de oportunidad',
            'Categoría de productos',
            'UEN',
            'Segmento',
            'Tipo de venta',
            'Proveedor de productos',
        ])
            expect(f.nativeElement.textContent).toContain(field)
        f.componentInstance.set('branches', [])
        await f.whenStable()
        expect(f.nativeElement.textContent).toContain('No hay registros para esta selección')
    })
})
