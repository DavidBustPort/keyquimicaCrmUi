import { Component, input } from '@angular/core'
@Component({ selector: 'app-empty-state', templateUrl: './empty-state.html' })
export class EmptyState {
    readonly title = input('Sin resultados')
    readonly description = input('Prueba con otros filtros o limpia la búsqueda.')
}
