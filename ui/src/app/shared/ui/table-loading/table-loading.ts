import { Component, input } from '@angular/core'
@Component({ selector: 'app-table-loading', templateUrl: './table-loading.html' })
export class TableLoading {
	readonly label = input('Cargando datos…')
}
