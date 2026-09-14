import { Component, input, output } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { ETAPAS, Proyecto } from '../../models/oportunidad'
@Component({ selector: 'app-proyectos-table', imports: [CurrencyPipe], templateUrl: './proyectos-table.html' })
export class ProyectosTable {
	readonly rows = input.required<Proyecto[]>()
	readonly edit = output<Proyecto>()
	readonly stages = ETAPAS
	readonly stageColors = ['bg-[#00a3ff] text-white', 'bg-[#008be6] text-white', 'bg-[#0072cc] text-white', 'bg-[#005bb3] text-white', 'bg-red-50 text-red-700']
}
