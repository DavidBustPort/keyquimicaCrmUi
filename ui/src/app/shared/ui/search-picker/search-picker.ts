import { Component, computed, input, output, signal } from '@angular/core'
import { EmptyState } from '@shared/ui/empty-state/empty-state'
export interface SearchChoice {
    id: number
    label: string
    description?: string
}
@Component({
    selector: 'app-search-picker',
    imports: [EmptyState],
    templateUrl: './search-picker.html',
})
export class SearchPicker {
    readonly options = input.required<SearchChoice[]>()
    readonly label = input('Buscar')
    readonly chosen = output<number>()
    readonly query = signal('')
    readonly matches = computed(() =>
        this.options()
            .filter((o) =>
                [o.id, o.label, o.description]
                    .join(' ')
                    .toLowerCase()
                    .includes(this.query().trim().toLowerCase()),
            )
            .slice(0, 20),
    )
}
