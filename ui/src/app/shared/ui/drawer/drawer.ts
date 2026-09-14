import { Component, DestroyRef, ElementRef, effect, inject, input, output, viewChild } from '@angular/core'
let nextDrawerId = 0
@Component({ selector: 'app-drawer', templateUrl: './drawer.html' })
export class Drawer {
	readonly titleId = 'drawer-title-' + nextDrawerId++
	readonly title = input.required<string>()
	readonly open = input(false)
	readonly closed = output<void>()
	readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog')
	private previousFocus: HTMLElement | null = null
	private restoreScroll: (() => void) | null = null
	private lockScroll() {
		const root = this.dialog().nativeElement.ownerDocument.documentElement
		const previous = root.style.overflow
		root.style.overflow = 'hidden'
		this.restoreScroll = () => {
			root.style.overflow = previous
		}
	}
	private unlockScroll() {
		this.restoreScroll?.()
		this.restoreScroll = null
	}
	constructor() {
		inject(DestroyRef).onDestroy(() => this.unlockScroll())
		effect(() => {
			const dialog = this.dialog().nativeElement
			if (this.open() && !dialog.open) {
				this.previousFocus = document.activeElement as HTMLElement
				dialog.showModal()
				this.lockScroll()
			} else if (!this.open() && dialog.open) {
				dialog.close()
				this.unlockScroll()
				this.previousFocus?.focus({ preventScroll: true })
			}
		})
	}
	backdrop(event: MouseEvent) {
		if (event.target !== this.dialog().nativeElement) return
		const rect = this.dialog().nativeElement.getBoundingClientRect()
		if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closed.emit()
	}
}
