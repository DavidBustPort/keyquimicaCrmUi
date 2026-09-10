import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core'
let nextModalId = 0

@Component({ selector: 'app-modal', templateUrl: './modal.html' })
export class Modal {
    readonly titleId = `modal-title-${nextModalId++}`
    readonly title = input.required<string>()
    readonly open = input(false)
    readonly closed = output<void>()
    readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog')
    private previousFocus: HTMLElement | null = null
    constructor() {
        effect(() => {
            const dialog = this.dialog().nativeElement
            if (this.open() && !dialog.open) {
                this.previousFocus = document.activeElement as HTMLElement
                dialog.showModal()
            } else if (!this.open() && dialog.open) {
                dialog.close()
                this.previousFocus?.focus()
            }
        })
    }
    backdrop(event: MouseEvent) {
        if (event.target === this.dialog().nativeElement) {
            const rect = this.dialog().nativeElement.getBoundingClientRect()
            if (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
            )
                this.closed.emit()
        }
    }
}
