import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ScrollToResults } from './scroll-to-results'

@Component({ imports: [ScrollToResults], template: '<section [appScrollToResults]="loading()" [resultsError]="error()"></section>' })
class Host {
	readonly loading = signal(false)
	readonly error = signal('')
}

describe('ScrollToResults', () => {
	it('scrolls after a successful load, but not on initial rendering or errors', async () => {
		const fixture = TestBed.createComponent(Host)
		fixture.detectChanges()
		await fixture.whenStable()
		const element = fixture.nativeElement.querySelector('section')
		const scroll = vi.fn()
		element.scrollIntoView = scroll
		fixture.detectChanges()
		await fixture.whenStable()
		expect(scroll).not.toHaveBeenCalled()
		fixture.componentInstance.loading.set(true)
		fixture.detectChanges()
		await fixture.whenStable()
		expect(scroll).not.toHaveBeenCalled()
		fixture.componentInstance.loading.set(false)
		fixture.detectChanges()
		await fixture.whenStable()
		expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' })
		fixture.componentInstance.loading.set(true)
		fixture.detectChanges()
		await fixture.whenStable()
		fixture.componentInstance.error.set('Error de conexión')
		fixture.componentInstance.loading.set(false)
		fixture.detectChanges()
		await fixture.whenStable()
		expect(scroll).toHaveBeenCalledTimes(1)
	})
})
