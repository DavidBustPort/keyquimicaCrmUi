import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { OportunidadesMockStore, montoProyecto } from './data-access/oportunidades-mock.store'
import { PRODUCTOS } from './data-access/oportunidades.catalogos'
import { ProyectoForm } from './components/proyecto-form/proyecto-form'
import { ProductosEditor } from './components/productos-editor/productos-editor'
import { EmbudoList } from './pages/embudo-list/embudo-list'
import { Oportunidades } from './pages/oportunidades/oportunidades'
import { ProspectosMockStore } from '@features/oportunidades/data-access/prospectos-mock.store'

describe('Oportunidades con datos mock', () => {
	beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }))
	beforeAll(() => {
		Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
			configurable: true,
			value: function (this: HTMLDialogElement) {
				this.open = true
			}
		})
		Object.defineProperty(HTMLDialogElement.prototype, 'close', {
			configurable: true,
			value: function (this: HTMLDialogElement) {
				this.open = false
			}
		})
	})
	afterAll(() => {
		Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
		Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
	})
	const newProject = (store: OportunidadesMockStore) =>
		store.create({
			prospectoId: 53,
			areaId: '2',
			solucionId: '21',
			tipoVenta: 'Instalada',
			aplicaciones: [{ id: '211', vpo: 5000 }]
		})[0]

	it('uses newly created prospects and requires dimension before creating opportunities', () => {
		const store = TestBed.inject(OportunidadesMockStore)
		const prospects = TestBed.inject(ProspectosMockStore)
		const id = prospects.save({
			razonSocial: 'Nuevo cliente integrado',
			contacto: 'Ana',
			correo: 'ana@example.com',
			telefono: '6145550000',
			uenId: '1',
			segmentoId: '11',
			tipoClienteId: '2',
			territorioId: '1',
			vpo: 5000,
			observaciones: ''
		})
		expect(store.clientes().some((c) => c.id === id)).toBe(true)
		const request = {
			prospectoId: id,
			areaId: '1',
			solucionId: '11',
			tipoVenta: 'Instalada' as const,
			aplicaciones: [{ id: '111', vpo: 5000 }]
		}
		expect(() => store.create(request)).toThrow(/dimensión/)
		expect(() => store.saveDimension(id, 0)).toThrow()
		store.saveDimension(id, 100)
		const projects = store.create(request)
		expect(projects[0]).toMatchObject({
			prospectoId: id,
			vpt: 34000,
			vpo: 5000,
			etapa: 'Análisis'
		})
		expect(() => store.create(request)).toThrow(/activo/)
	})

	it('creates multiple applications through the form and emits the continue-with-products action', async () => {
		const fixture = TestBed.createComponent(ProyectoForm)
		fixture.componentRef.setInput('prospectoId', 53)
		await fixture.whenStable()
		const component = fixture.componentInstance
		const saved = vi.fn()
		component.saved.subscribe(saved)
		component.save(true)
		expect(component.error()).toBeTruthy()
		component.form.controls.areaId.setValue('2')
		await fixture.whenStable()
		component.form.controls.solucionId.setValue('21')
		await fixture.whenStable()
		expect(component.apps().length).toBe(2)
		for (const app of component.apps()) {
			app.selected.setValue(true)
			app.vpo.setValue(4500)
		}
		component.save(true)
		expect(saved).toHaveBeenCalled()
		expect(saved.mock.calls[0][0].projects.length).toBe(2)
		expect(saved.mock.calls[0][0].continueProducts).toBe(true)
		const store = TestBed.inject(OportunidadesMockStore)
		expect(store.proyectos().length).toBe(14)
	})

	it('adds products, prevents duplicates, validates CSV atomically and saves calculated totals', async () => {
		const fixture = TestBed.createComponent(ProductosEditor)
		fixture.componentRef.setInput('projectId', 7)
		await fixture.whenStable()
		const editor = fixture.componentInstance
		editor.add('KEY-101')
		editor.add('KEY-101')
		expect(editor.products().length).toBe(1)
		editor.update('KEY-101', 'cantidad', '3')
		expect(editor.total()).toBe(1260)
		expect(() => editor.importText('SKU,Cantidad,PrecioVenta\nKEY-102,2,580\nBAD,1,20')).toThrow(/SKU no encontrado/)
		expect(editor.products().length).toBe(1)
		editor.importText('SKU,Cantidad,PrecioVenta\nKEY-102,2,580')
		expect(editor.products().length).toBe(2)
		editor.update('KEY-101', 'cantidad', '0')
		editor.save()
		expect(editor.error()).toContain('mayores que cero')
		editor.update('KEY-101', 'cantidad', '3')
		editor.save()
		const p = TestBed.inject(OportunidadesMockStore).get(7)
		expect(p.etapa).toBe('Promoción')
		expect(montoProyecto(p)).toBe(2420)
	})

	it('requires price justification and blocks stage changes until mock approval', async () => {
		const fixture = TestBed.createComponent(ProductosEditor)
		fixture.componentRef.setInput('projectId', 7)
		await fixture.whenStable()
		const editor = fixture.componentInstance
		const store = TestBed.inject(OportunidadesMockStore)
		editor.add('KEY-101')
		editor.update('KEY-101', 'precioVenta', '300')
		editor.save()
		await fixture.whenStable()
		expect(editor.authorization()).toBe(true)
		expect((fixture.nativeElement as HTMLElement).querySelectorAll('dialog')[1].open).toBe(true)
		editor.commit()
		expect(editor.error()).toContain('justificación')
		expect(store.get(7).productos.length).toBe(0)
		editor.update('KEY-101', 'motivo', 'Precios de competencia')
		editor.update('KEY-101', 'justificacion', 'Volumen anual previsto')
		editor.update('KEY-101', 'vigencia', '2099-12-31')
		editor.commit()
		expect(store.get(7).productos[0].pendiente).toBe(true)
		expect(() => store.transition(7, 'Negociación')).toThrow(/pendientes/)
		store.approvePrices(7)
		store.transition(7, 'Negociación')
		expect(store.get(7).etapa).toBe('Negociación')
	})

	it('closes and cancels projects with validation and prevents subsequent edits', () => {
		const store = TestBed.inject(OportunidadesMockStore)
		const p = newProject(store)
		expect(() => store.transition(p.id, 'Cierre')).toThrow()
		store.saveProducts(p.id, [{ ...PRODUCTOS[0], cantidad: 4, precioVenta: 420, pendiente: false }])
		store.transition(p.id, 'Cierre')
		expect(store.get(p.id)).toMatchObject({ etapa: 'Cierre', acys: 1680 })
		expect(() => store.updateVpo(p.id, 100)).toThrow()
		expect(() => store.saveProducts(p.id, [])).toThrow()
		expect(() => store.transition(7, 'Cancelada', ' ')).toThrow(/motivo/)
		store.transition(7, 'Cancelada', 'Sin presupuesto')
		expect(store.get(7)).toMatchObject({
			etapa: 'Cancelada',
			motivoCancelacion: 'Sin presupuesto'
		})
		expect(() => store.transition(7, 'Negociación')).toThrow()
	})

	it('filters the funnel and resets pagination when changing filters', async () => {
		const fixture = TestBed.createComponent(EmbudoList)
		await fixture.whenStable()
		const list = fixture.componentInstance
		expect(list.rows().length).toBe(10)
		list.page.set(2)
		expect(list.rows().length).toBe(2)
		list.filters.controls.etapa.setValue('Cierre')
		expect(list.page()).toBe(1)
		expect(list.filtered().length).toBe(2)
		list.filters.controls.search.setValue('sin coincidencias')
		expect(list.filtered().length).toBe(0)
		list.filters.reset()
		expect(list.filtered().length).toBe(12)
	})

	it('protects unsaved edits and supports cancelling or confirming navigation', async () => {
		const fixture = TestBed.createComponent(Oportunidades)
		await fixture.whenStable()
		const page = fixture.componentInstance
		page.productDirty.set(true)
		const cancelled = page.confirmNavigation()
		expect(page.pendingAction()).toBeTruthy()
		page.cancelDiscard()
		expect(await cancelled).toBe(false)
		expect(page.productDirty()).toBe(true)
		const accepted = page.confirmNavigation()
		page.confirmDiscard()
		expect(await accepted).toBe(true)
		expect(page.productDirty()).toBe(false)
	})
})
