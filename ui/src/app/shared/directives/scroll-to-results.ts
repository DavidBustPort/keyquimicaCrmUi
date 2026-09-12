import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core'
@Directive({ selector: '[appScrollToResults]', host: { '[style.scroll-margin-top]': "'7rem'" } })
export class ScrollToResults {
	readonly appScrollToResults = input.required<boolean>()
	readonly resultsError = input('')
	private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
	private wasLoading = false
	constructor() {
		afterRenderEffect(() => {
			const loading = this.appScrollToResults()
			const failed = !!this.resultsError()
			if (this.wasLoading && !loading && !failed) {
				const element = this.element.nativeElement
				const reduced = element.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
				element.scrollIntoView?.({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
			}
			this.wasLoading = loading
		})
	}
}
