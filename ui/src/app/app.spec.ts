import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { App } from './app'
import { routes } from './app.routes'

describe('CRM layout and migrated routes', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [provideRouter(routes)],
        }).compileComponents()
    })

    it('renders the layout and preserves all Vue route variants and report aliases', async () => {
        const fixture = TestBed.createComponent(App)
        const router = TestBed.inject(Router)
        const cases = [
            ['/', 'Inicio'],
            ['/prospectos', 'Lista de Prospectos'],
            ['/prospectos/add', 'Nuevo Prospecto'],
            ['/prospectos/edit/42', 'Editar Prospecto'],
            ['/oportunidades-proyectos', 'Embudo de Proyectos'],
            ['/oportunidades-proyectos/oportunidades', 'Oportunidades'],
            ['/oportunidades-proyectos/oportunidades/42', 'Oportunidades'],
            ['/oportunidades-proyectos/oportunidades/42/7', 'Oportunidades'],
            ['/leads', 'Sin acceso'],
            ['/reportes', 'Reportes'],
            ['/gestion-proyectos', 'Gestión de Oportunidades'],
            ['/tracking-cerrados', 'Reporte de estado comercial'],
            ['/prospeccion', 'Prospección'],
            ['/reportes/gestion-proyectos', 'Gestión de Oportunidades'],
            ['/reportes/tracking-cerrados', 'Reporte de estado comercial'],
            ['/reportes/prospeccion', 'Prospección'],
            ['/no-access', 'Sin acceso'],
        ]
        for (const [url, title] of cases) {
            await router.navigateByUrl(url)
            await fixture.whenStable()
            fixture.detectChanges()
            const element = fixture.nativeElement as HTMLElement
            expect(element.querySelector('h1')?.textContent?.trim(), url).toBe(title)
            expect(element.querySelector('app-header'), url).toBeTruthy()
            expect(element.querySelector('#sidebar'), url).toBeTruthy()
        }
    })

    it('toggles reports and expands only the prospect list', async () => {
        const fixture = TestBed.createComponent(App)
        const router = TestBed.inject(Router)
        await router.navigateByUrl('/prospectos')
        await fixture.whenStable()
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const reportButton = element.querySelector<HTMLButtonElement>(
            '[aria-controls="report-links"]',
        )!
        reportButton.click()
        fixture.detectChanges()
        expect(reportButton.getAttribute('aria-expanded')).toBe('true')
        reportButton.click()
        fixture.detectChanges()
        expect(reportButton.getAttribute('aria-expanded')).toBe('false')
        element.querySelector<HTMLButtonElement>('[aria-label="Expandir contenido"]')!.click()
        fixture.detectChanges()
        expect(element.querySelector('main')?.classList.contains('expanded')).toBe(true)
        await router.navigateByUrl('/leads')
        await fixture.whenStable()
        fixture.detectChanges()
        expect(element.querySelector('[aria-label="Expandir contenido"]')).toBeNull()
        expect(element.querySelector('main')?.classList.contains('expanded')).toBe(false)
    })
})
