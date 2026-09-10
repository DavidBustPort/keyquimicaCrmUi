import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { ProspectoForm } from './components/prospecto-form/prospecto-form'
import { LeadsPicker } from './components/leads-picker/leads-picker'
import { ProspectosList } from './pages/prospectos-list/prospectos-list'
import { ProspectosMockStore } from './data-access/prospectos-mock.store'

const valid = {
    razonSocial: 'Empresa de prueba',
    contacto: '',
    correo: '',
    telefono: '',
    uenId: '1',
    segmentoId: '11',
    tipoClienteId: '1',
    territorioId: '1',
    vpo: 25000,
    observaciones: '',
}

describe('Prospectos con datos mock', () => {
    // jsdom does not implement the browser's native dialog methods.
    beforeAll(() => {
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
            configurable: true,
            value: function (this: HTMLDialogElement) {
                this.open = true
            },
        })
        Object.defineProperty(HTMLDialogElement.prototype, 'close', {
            configurable: true,
            value: function (this: HTMLDialogElement) {
                this.open = false
            },
        })
    })
    afterAll(() => {
        Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
        Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    })
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }))

    it('validates required fields and creates a prospect in the shared list', async () => {
        const fixture = TestBed.createComponent(ProspectoForm)
        await fixture.whenStable()
        const form = fixture.componentInstance
        const store = TestBed.inject(ProspectosMockStore)
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
        const initial = store.prospectos().length
        form.save()
        expect(store.prospectos().length).toBe(initial)
        expect(form.error('razonSocial')).toBeTruthy()
        form.form.patchValue({ ...valid, razonSocial: '   ' })
        form.save()
        expect(store.prospectos().length).toBe(initial)
        form.form.patchValue(valid)
        form.save()
        expect(store.prospectos().length).toBe(initial + 1)
        expect(store.prospectos()[0]).toMatchObject({ ...valid, fuente: 'TD', registro: true })
        expect(navigate).toHaveBeenCalledWith('/prospectos')
    })

    it('opens the leads modal and requires contact details and observations before developing a lead', async () => {
        const fixture = TestBed.createComponent(ProspectoForm)
        await fixture.whenStable()
        const form = fixture.componentInstance
        const store = TestBed.inject(ProspectosMockStore)
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
        const element = fixture.nativeElement as HTMLElement
        const trigger = Array.from(element.querySelectorAll('button')).find((b) =>
            b.textContent?.includes('Explorar leads'),
        )!
        trigger.click()
        await fixture.whenStable()
        fixture.detectChanges()
        const dialog = element.querySelector('dialog')!
        expect(dialog.open).toBe(true)
        const useLead = Array.from(dialog.querySelectorAll('button')).find((b) =>
            b.textContent?.includes('Usar este lead'),
        )!
        useLead.click()
        await fixture.whenStable()
        fixture.detectChanges()
        expect(dialog.open).toBe(false)
        expect(form.form.controls.razonSocial.value).toBe('Hotel Mirador')
        expect(store.leads()[0].estado).toBe('Disponible')
        form.form.patchValue({
            uenId: '1',
            segmentoId: '11',
            tipoClienteId: '1',
            territorioId: '1',
            vpo: 2000,
        })
        form.save()
        expect(form.error('observaciones')).toBeTruthy()
        expect(store.leads()[0].estado).toBe('Disponible')
        form.form.controls.observaciones.setValue('Agendar visita de diagnóstico.')
        form.save()
        expect(store.leads()[0].estado).toBe('Desarrollado')
        expect(store.prospectos()[0]).toMatchObject({ leadId: 101, fuente: 'LD' })
    })

    it('edits an existing prospect and handles missing IDs', async () => {
        const fixture = TestBed.createComponent(ProspectoForm)
        fixture.componentRef.setInput('prospectoId', 43)
        await fixture.whenStable()
        const form = fixture.componentInstance
        const store = TestBed.inject(ProspectosMockStore)
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
        expect(form.form.controls.razonSocial.value).toBe('Clínica del Valle')
        form.form.controls.razonSocial.setValue('Clínica del Valle actualizada')
        form.save()
        expect(store.prospectos().find((p) => p.id === 43)?.razonSocial).toBe(
            'Clínica del Valle actualizada',
        )
        fixture.componentRef.setInput('prospectoId', 9999)
        await fixture.whenStable()
        expect(form.missing()).toBe(true)
    })

    it('filters and paginates the list and clears hidden stage filters', async () => {
        const fixture = TestBed.createComponent(ProspectosList)
        await fixture.whenStable()
        const list = fixture.componentInstance
        expect(list.rows().length).toBe(10)
        list.page.set(2)
        expect(list.rows().length).toBe(2)
        list.filters.controls.search.setValue('Hotel')
        expect(list.page()).toBe(1)
        expect(list.filtered().length).toBe(2)
        list.filters.controls.fuente.setValue('TD')
        expect(list.filtered().every((p) => p.fuente === 'TD')).toBe(true)
        list.clear()
        expect(list.filtered().length).toBe(12)
        list.toggleDetails()
        list.filters.controls.etapa.setValue('Cierre')
        expect(list.filtered().length).toBe(3)
        list.toggleDetails()
        expect(list.filters.controls.etapa.value).toBe('')
        expect(list.filtered().length).toBe(12)
        list.filters.controls.search.setValue('empresa inexistente')
        await fixture.whenStable()
        expect(list.filtered().length).toBe(0)
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin resultados')
    })

    it('rejects a lead only with a valid reason and removes it from suggestions', async () => {
        const fixture = TestBed.createComponent(LeadsPicker)
        await fixture.whenStable()
        const picker = fixture.componentInstance
        picker.beginReject(101)
        picker.reject()
        expect(picker.error()).toBeTruthy()
        expect(picker.filtered().length).toBe(6)
        picker.reason.setValue('Otro')
        picker.comment.setValue('   ')
        picker.reject()
        expect(picker.filtered().length).toBe(6)
        picker.comment.setValue('Registro duplicado')
        picker.reject()
        expect(picker.filtered().length).toBe(5)
        expect(TestBed.inject(ProspectosMockStore).leads()[0]).toMatchObject({
            estado: 'Rechazado',
            motivo: 'Registro duplicado',
        })
    })
})
