import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { Layout } from '../layout'
import { AuthStore } from '../../auth/auth.store'
import { RikFilterStore } from '../../filters/rik-filter.store'
@Component({ template: '' })
class TestPage {}
describe('Global header RIK filter', () => {
    it('requires an enabled route and a logged-in manager, preserving selection across navigation', async () => {
        const manager = signal(true)
        const loggedIn = signal(true)
        const selected = signal<number | null>(7)
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: '',
                        component: Layout,
                        children: [
                            {
                                path: 'enabled',
                                component: TestPage,
                                data: { showFilterByRik: true },
                            },
                            { path: 'disabled', component: TestPage },
                        ],
                    },
                ]),
                {
                    provide: AuthStore,
                    useValue: {
                        session: () => ({
                            userName: 'Ana Torres',
                            loggedIn: true,
                            sucursalId: 10,
                            role: 'Gte',
                        }),
                        isManager: manager,
                        isCentral: () => false,
                        isFullyAuthenticated: loggedIn,
                    },
                },
                {
                    provide: RikFilterStore,
                    useValue: {
                        selectedRikId: selected,
                        select: (id: number | null) => selected.set(id),
                        riks: () => [{ id: 7, name: 'Ejecutivo' }],
                        catalog: { isLoading: () => false, error: () => undefined },
                    },
                },
            ],
        })
        const router = TestBed.inject(Router)
        await router.navigateByUrl('/enabled')
        const fixture = TestBed.createComponent(Layout)
        await fixture.whenStable()
        const filter = () =>
            fixture.nativeElement.querySelector('select[aria-label="Filtrar por RIK"]')
        expect(filter()).not.toBeNull()
        await router.navigateByUrl('/disabled')
        await fixture.whenStable()
        expect(filter()).toBeNull()
        await router.navigateByUrl('/enabled')
        await fixture.whenStable()
        expect(filter()).not.toBeNull()
        expect(selected()).toBe(7)
        manager.set(false)
        await fixture.whenStable()
        expect(filter()).toBeNull()
        manager.set(true)
        loggedIn.set(false)
        await fixture.whenStable()
        expect(filter()).toBeNull()
    })
})
