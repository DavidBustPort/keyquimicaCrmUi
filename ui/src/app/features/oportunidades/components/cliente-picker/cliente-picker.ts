import { Component, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, of, Subject, switchMap, timer } from 'rxjs'
import { OportunidadesApiService } from '@features/oportunidades/data-access/oportunidades-api.service'
import { ClienteBusqueda } from '@features/oportunidades/models/oportunidad'
import { Modal } from '@shared/ui/modal/modal'
import { TableLoading } from '@shared/ui/table-loading/table-loading'

@Component({ selector: 'app-cliente-picker', imports: [FormsModule, Modal, TableLoading], templateUrl: './cliente-picker.html' })
export class ClientePicker {
	readonly navigateOnSelect = input(true)
	readonly selected = output<ClienteBusqueda>()
	readonly closed = output<void>()
	readonly rows = signal<ClienteBusqueda[]>([])
	readonly loading = signal(false)
	readonly navigating = signal(false)
	readonly searched = signal(false)
	readonly error = signal('')
	search = ''
	private readonly api = inject(OportunidadesApiService)
	private readonly router = inject(Router)
	private readonly searches = new Subject<{ query: string; delay: number }>()
	constructor() {
		this.searches
			.pipe(
				switchMap(({ query, delay }) =>
					query
						? (delay ? timer(delay) : of(0)).pipe(
								switchMap(() => this.api.clientes(query)),
								catchError(() => of(null))
							)
						: of([])
				),
				takeUntilDestroyed()
			)
			.subscribe((rows) => {
				this.loading.set(false)
				if (rows === null) this.error.set('No se pudieron buscar los clientes. Intenta nuevamente.')
				else this.rows.set(rows)
			})
	}
	updateSearch(value: string) {
		this.search = value
		this.find(300)
	}
	find(delay = 0) {
		if (this.navigating()) return
		this.rows.set([])
		this.error.set('')
		this.searched.set(!!this.search.trim())
		this.loading.set(!!this.search.trim())
		this.searches.next({ query: this.search.trim(), delay })
	}
	async choose(client: ClienteBusqueda) {
		if (this.navigating() || this.loading()) return
		if (!this.navigateOnSelect()) {
			this.selected.emit(client)
			return
		}
		this.navigating.set(true)
		this.error.set('')
		try {
			if (await this.router.navigate(['/oportunidades-proyectos/oportunidades', client.prospectoId || client.id])) this.closed.emit()
			else this.error.set('No se pudo abrir el cliente. Intenta nuevamente.')
		} catch {
			this.error.set('No se pudo abrir el cliente. Intenta nuevamente.')
		} finally {
			this.navigating.set(false)
		}
	}
}
