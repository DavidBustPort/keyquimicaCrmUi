import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { ClientePicker } from './cliente-picker'

describe('ClientePicker', () => {
	beforeEach(() => {
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
	beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }))
	afterEach(() => TestBed.inject(HttpTestingController).verify())
	it('searches the API and navigates only after selecting the customer', async () => {
		const f = TestBed.createComponent(ClientePicker)
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
		f.componentInstance.search = ' Empresa '
		f.componentInstance.find()
		const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/oportunidades/clientes'))
		expect(request.request.params.get('filter')).toBe('Empresa')
		request.flush({ succeeded: true, data: [{ id: 900, prospectoId: 42, name: 'Empresa' }] })
		expect(navigate).not.toHaveBeenCalled()
		await f.componentInstance.choose(f.componentInstance.rows()[0])
		expect(navigate).toHaveBeenCalledWith(['/oportunidades-proyectos/oportunidades', 42])
	})

	it('searches from the input and allows the form to submit immediately', async () => {
		const f = TestBed.createComponent(ClientePicker)
		f.detectChanges()
		await f.whenStable()
		const input: HTMLInputElement = f.nativeElement.querySelector('input')
		input.value = 'Empresa'
		input.dispatchEvent(new Event('input'))
		f.detectChanges()
		const http = TestBed.inject(HttpTestingController)
		http.expectNone((r) => r.url.endsWith('/oportunidades/clientes'))
		f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
		const request = http.expectOne((r) => r.url.endsWith('/oportunidades/clientes'))
		expect(request.request.params.get('filter')).toBe('Empresa')
		request.flush({ succeeded: true, data: [] })
		f.destroy()
	})
	it('waits for the final text and cancels when the search is cleared', () => {
		vi.useFakeTimers()
		try {
			const f = TestBed.createComponent(ClientePicker)
			const http = TestBed.inject(HttpTestingController)
			f.componentInstance.updateSearch('Emp')
			vi.advanceTimersByTime(200)
			f.componentInstance.updateSearch('Empresa')
			vi.advanceTimersByTime(299)
			http.expectNone((r) => r.url.endsWith('/oportunidades/clientes'))
			vi.advanceTimersByTime(1)
			const request = http.expectOne((r) => r.url.endsWith('/oportunidades/clientes'))
			expect(request.request.params.get('filter')).toBe('Empresa')
			f.componentInstance.updateSearch('')
			expect(request.cancelled).toBe(true)
			expect(f.componentInstance.loading()).toBe(false)
			f.destroy()
		} finally {
			vi.useRealTimers()
		}
	})

	it('lets the host confirm unsaved changes before changing customers', async () => {
		const f = TestBed.createComponent(ClientePicker)
		f.componentRef.setInput('navigateOnSelect', false)
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigate')
		const selected = vi.fn()
		f.componentInstance.selected.subscribe(selected)
		const client = { id: 900, prospectoId: 42, name: 'Empresa' }
		await f.componentInstance.choose(client)
		expect(selected).toHaveBeenCalledWith(client)
		expect(navigate).not.toHaveBeenCalled()
	})
	it('cancels pending searches when the modal is destroyed', () => {
		const f = TestBed.createComponent(ClientePicker)
		f.componentInstance.search = 'Empresa'
		f.componentInstance.find()
		const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/oportunidades/clientes'))
		f.destroy()
		expect(request.cancelled).toBe(true)
	})
})
