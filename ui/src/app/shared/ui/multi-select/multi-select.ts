import { Component, computed, ElementRef, input, output, viewChild } from '@angular/core'
export interface MultiOption {
    value: string
    label: string
}
@Component({
    host: {
        class: 'block min-w-0',
        '(document:click)': 'closeOnOutsideClick($event)',
    },
    selector: 'app-multi-select',
    templateUrl: './multi-select.html',
})
export class MultiSelect {
    private readonly menu = viewChild.required<ElementRef<HTMLDetailsElement>>('menu')
    readonly label = input.required<string>()
    readonly options = input.required<readonly MultiOption[]>()
    readonly selected = input.required<string[]>()
    readonly selectionChange = output<string[]>()
    readonly all = computed(
        () =>
            this.options().length > 0 &&
            this.options().every((o) => this.selected().includes(o.value)),
    )
    readonly summary = computed(() =>
        this.all()
            ? 'Todos (' + this.options().length + ')'
            : this.selected().length
              ? this.selected().length + ' seleccionados'
              : 'Sin selección',
    )
    closeOnOutsideClick(event: MouseEvent) {
        const menu = this.menu().nativeElement
        if (menu.open && !event.composedPath().includes(menu)) {
            menu.open = false
        }
    }
    toggle(value: string) {
        this.selectionChange.emit(
            this.selected().includes(value)
                ? this.selected().filter((id) => id !== value)
                : [...this.selected(), value],
        )
    }
    toggleAll() {
        this.selectionChange.emit(this.all() ? [] : this.options().map((o) => o.value))
    }
}
