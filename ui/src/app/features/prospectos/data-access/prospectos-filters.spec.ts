import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { RikFilterStore } from '@core/filters/rik-filter.store'
import { ProspectosApiService } from './prospectos-api.service'
import { ProspectosService } from './prospectos.service'

describe('Filtros de detalle de Prospectos', () => {
	it('only sends stage filters for managers with detail enabled and clears them when hidden', () => {
		const manager = signal(true)
		TestBed.configureTestingModule({
			providers: [
				ProspectosService,
				{ provide: AuthStore, useValue: { isManager: manager, isFullyAuthenticated: () => true, isCentral: () => false, session: () => ({}) } },
				{ provide: RikFilterStore, useValue: { selectedRikId: () => null } },
				{ provide: ProspectosApiService, useValue: { list: () => of({ totalRows: 0, prospectos: [] }) } }
			]
		})
		const store = TestBed.inject(ProspectosService)
		store.filter('etapa', '2')
		store.filter('etapaLead', 'gte')
		expect(store.query().filterEtapaOportunidad).toBeNull()
		store.setManagerDetails(true)
		expect(store.query().filterEtapaOportunidad).toBe(2)
		expect(store.query().filterEtapaLead).toBe('gte')
		store.setManagerDetails(false)
		expect(store.filters().etapa).toBe('')
		expect(store.filters().etapaLead).toBe('')
		manager.set(false)
		store.setManagerDetails(true)
		expect(store.managerDetails()).toBe(false)
		expect(store.query().filterEtapaLead).toBeNull()
	})
})
