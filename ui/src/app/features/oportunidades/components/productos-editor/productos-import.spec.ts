import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { ProductosEditor } from './productos-editor'
import { OportunidadesApiService } from '../../data-access/oportunidades-api.service'
import { Producto } from '../../models/oportunidad'
const product = (sku: number, price: number): Producto => ({ sku, descripcion: 'Producto ' + sku, unidades: 1, precioObjetivo: 100, precioLista: 100, precioVenta: price, monto: price, estatusAutorizacion: false })
describe('Importación de productos', () => {
	const api = { importProducts: vi.fn() }
	beforeEach(() => {
		api.importProducts.mockReset()
		TestBed.configureTestingModule({ providers: [{ provide: OportunidadesApiService, useValue: api }] })
	})
	async function setup() {
		const f = TestBed.createComponent(ProductosEditor)
		f.componentRef.setInput('project', { idOportunidad: 1, etapa: 1, aplicacion: 'Aplicación', productos: [product(28, 50)] })
		f.componentRef.setInput('segmentId', 1)
		f.detectChanges()
		await f.whenStable()
		return f
	}
	const event = () => ({ target: { files: [new File(['test'], 'cargaMasiva.xlsx')], value: 'file' } }) as unknown as Event
	it('preserves existing products and adds only validated new ones with Excel prices', async () => {
		const f = await setup()
		api.importProducts.mockReturnValue(of({ products: [product(28, 900), product(29, 150)], notFoundSkus: [999] }))
		await f.componentInstance.importExcel(event())
		f.detectChanges()
		expect(f.componentInstance.products().map((p) => [p.sku, p.precioVenta])).toEqual([
			[28, 50],
			[29, 150]
		])
		expect(f.nativeElement.textContent).toContain('ya estaban en la tabla: 28')
		expect(f.nativeElement.textContent).toContain('no se encontraron para el segmento: 999')
	})
	it('keeps the table unchanged when the template fails validation', async () => {
		const f = await setup()
		api.importProducts.mockReturnValue(throwError(() => new Error('precio obligatorio')))
		await f.componentInstance.importExcel(event())
		expect(f.componentInstance.products()).toEqual([product(28, 50)])
		expect(f.componentInstance.error()).toBe('precio obligatorio')
	})
})
