import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { By } from '@angular/platform-browser'
import { App } from '@app/app'
import { routes } from '@app/app.routes'
import { Leads } from './pages/leads/leads'
import { LeadsMockStore } from './data-access/leads-mock.store'
import { LeadAssignment } from './components/lead-assignment/lead-assignment'
import { LeadRejection } from './components/lead-rejection/lead-rejection'
import { ProspectosMockStore } from '@features/prospectos/data-access/prospectos-mock.store'
import { ProspectoForm } from '@features/prospectos/components/prospecto-form/prospecto-form'
import { LeadsPicker } from '@features/prospectos/components/leads-picker/leads-picker'

describe('Leads: migration and shared mock workflows', () => {
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
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }))

    it('scopes representative leads and filters, paginates and clears the manager view', async () => {
        const fixture = TestBed.createComponent(Leads)
        await fixture.whenStable()
        const page = fixture.componentInstance
        expect(page.visible().length).toBe(8)
        expect(page.visible().every((l) => l.representanteId === '1')).toBe(true)
        page.setView('gerente')
        expect(page.visible().length).toBe(12)
        page.size.set(5)
        page.page.set(3)
        expect(page.rows().length).toBe(2)
        page.filters.controls.search.setValue('Hotel Mirador')
        expect(page.currentPage()).toBe(1)
        expect(page.filtered().map((l) => l.id)).toEqual([101])
        page.filters.reset()
        page.filters.controls.estado.setValue('Pendiente')
        expect(page.filtered().length).toBe(2)
        page.filters.controls.sucursal.setValue('3')
        expect(page.filtered().map((l) => l.id)).toEqual([110])
        page.filters.controls.search.setValue('no existe')
        await fixture.whenStable()
        expect(fixture.nativeElement.textContent).toContain('No hay leads para mostrar')
        page.setView('representante')
        expect(page.filters.getRawValue()).toEqual({ search: '', estado: '', sucursal: '' })
        expect(page.visible().length).toBe(8)
    })

    it('shows contact detail in a modal and hides manager actions from the representative', async () => {
        const fixture = TestBed.createComponent(Leads)
        await fixture.whenStable()
        const element = fixture.nativeElement as HTMLElement
        element
            .querySelector<HTMLButtonElement>('[aria-label="Ver detalle de Hotel Mirador"]')!
            .click()
        await fixture.whenStable()
        expect(element.querySelector('dialog')!.open).toBe(true)
        expect(element.querySelector('dialog')!.textContent).toContain('Sofía Reyes')
        expect(element.querySelector('dialog')!.textContent).not.toContain('Cambiar sucursal')
        fixture.componentInstance.setView('gerente')
        fixture.componentInstance.selectedId.set(101)
        await fixture.whenStable()
        expect(element.querySelector('dialog')!.textContent).toContain('Cambiar sucursal')
        element.querySelector<HTMLButtonElement>('[aria-label="Cerrar modal"]')!.click()
        await fixture.whenStable()
        expect(element.querySelector('dialog')!.open).toBe(false)
    })

    it('validates branch assignment and clears the previous representative when transferring a lead', async () => {
        const store = TestBed.inject(LeadsMockStore)
        store.view.set('gerente')
        const fixture = TestBed.createComponent(LeadAssignment)
        fixture.componentRef.setInput('lead', store.get(101))
        fixture.componentRef.setInput('mode', 'sucursal')
        await fixture.whenStable()
        const editor = fixture.componentInstance
        editor.selection.setValue('')
        editor.save()
        expect(editor.error()).toBeTruthy()
        expect(store.get(101).sucursalId).toBe('1')
        editor.selection.setValue('2')
        editor.save()
        expect(store.get(101)).toMatchObject({
            sucursalId: '2',
            representanteId: '',
            estado: 'Pendiente',
        })
        expect(() => store.assign(101, '1')).toThrow(/sucursal/)
        fixture.componentRef.setInput('lead', store.get(101))
        fixture.componentRef.setInput('mode', 'representante')
        await fixture.whenStable()
        expect(editor.options().map((r) => r.value)).toEqual(['3', '4'])
        editor.selection.setValue('3')
        editor.save()
        expect(store.get(101)).toMatchObject({ representanteId: '3', estado: 'Disponible' })
        expect(store.canDevelop(101)).toBe(false)
    })

    it('requires a rejection reason and synchronizes rejected leads with the prospect suggestions', async () => {
        const store = TestBed.inject(LeadsMockStore)
        store.view.set('gerente')
        const picker = TestBed.createComponent(LeadsPicker)
        await picker.whenStable()
        expect(picker.componentInstance.filtered().length).toBe(6)
        const fixture = TestBed.createComponent(LeadRejection)
        fixture.componentRef.setInput('leadId', 101)
        await fixture.whenStable()
        const rejection = fixture.componentInstance
        rejection.save()
        expect(rejection.error()).toContain('Selecciona')
        expect(store.get(101).estado).toBe('Disponible')
        rejection.reason.setValue('otro')
        rejection.explanation.setValue('  ')
        rejection.save()
        expect(rejection.error()).toContain('Especifica')
        rejection.explanation.setValue('Registro duplicado')
        rejection.save()
        expect(store.get(101)).toMatchObject({
            estado: 'Rechazado',
            motivo: 'Registro duplicado',
            rechazadoPor: 'gerente',
        })
        expect(picker.componentInstance.filtered().length).toBe(5)
        expect(TestBed.inject(ProspectosMockStore).leads()).toBe(store.leads())
        expect(() => store.assign(101, '1')).toThrow()
        expect(() => store.changeBranch(101, '2')).toThrow()
    })

    it('rejects manager mutations in representative mode and prevents editing finalized leads', () => {
        const store = TestBed.inject(LeadsMockStore)
        expect(() => store.assign(101, '2')).toThrow(/gerente/)
        expect(() => store.changeBranch(101, '2')).toThrow(/gerente/)
        expect(() => store.reject(101, 'Otro')).toThrow(/gerente/)
        store.view.set('gerente')
        expect(() => store.assign(108, '2')).toThrow(/desarrollado/)
        expect(() => store.reject(108, 'Sin interés')).toThrow(/desarrollado/)
        store.assign(107, '1')
        expect(store.get(107).estado).toBe('Disponible')
        expect(store.canDevelop(107)).toBe(true)
    })

    it('prefills a prospect from the lead link and marks it developed only after saving', async () => {
        const fixture = TestBed.createComponent(App)
        const router = TestBed.inject(Router)
        await router.navigateByUrl('/prospectos/add?leadId=101')
        await fixture.whenStable()
        const form = fixture.debugElement.query(By.directive(ProspectoForm))
            .componentInstance as ProspectoForm
        expect(form.form.controls.razonSocial.value).toBe('Hotel Mirador')
        expect(form.selectedLead()?.id).toBe(101)
        const store = TestBed.inject(LeadsMockStore)
        expect(store.get(101).estado).toBe('Disponible')
        form.form.patchValue({
            uenId: '1',
            segmentoId: '11',
            tipoClienteId: '1',
            territorioId: '1',
            vpo: 5000,
            observaciones: 'Visita de diagnóstico',
        })
        form.save()
        await fixture.whenStable()
        expect(store.get(101).estado).toBe('Desarrollado')
        expect(TestBed.inject(ProspectosMockStore).prospectos()[0]).toMatchObject({
            leadId: 101,
            fuente: 'LD',
        })
        expect(store.canDevelop(101)).toBe(false)
    })
})
