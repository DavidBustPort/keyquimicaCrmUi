import { Component, input, output } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { ETAPAS, Proyecto } from '../../models/oportunidad'
@Component({ selector: 'app-proyectos-table', imports: [CurrencyPipe], templateUrl: './proyectos-table.html' })
export class ProyectosTable {
	readonly rows = input.required<Proyecto[]>()
	readonly edit = output<Proyecto>()
	readonly stages = ETAPAS
}
