import { MonthCalendar } from '@shared/ui/month-calendar/month-calendar'
import { TableLoading } from '@shared/ui/table-loading/table-loading'
import { ScrollToResults } from '@shared/directives/scroll-to-results'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { ProspectosService } from '@features/prospectos/data-access/prospectos.service'
import { ProspectoDetail, ProspectoRow, STAGES, stageTotals } from '@features/prospectos/models/prospecto'
import { Pagination } from '@shared/ui/pagination/pagination'
import { Modal } from '@shared/ui/modal/modal'
@Component({ selector: 'app-prospectos-list', imports: [MonthCalendar, TableLoading, ScrollToResults, CurrencyPipe, FormsModule, RouterLink, Pagination, Modal], providers: [ProspectosService], templateUrl: './prospectos-list.html' })
export class ProspectosList {
	readonly store = inject(ProspectosService)
	readonly stages = STAGES
	readonly stageTotals = stageTotals
	readonly detail = signal<ProspectoDetail | null>(null)
	readonly selected = signal<ProspectoRow | null>(null)
	readonly detailLoading = signal(false)
	readonly detailError = signal('')
	readonly showDetails = computed(() => this.store.auth.isManager() && this.store.managerDetails())

	private detailVersion = 0
	constructor() {
		effect(() => {
			this.store.auth.session()
			this.store.rikFilter.selectedRikId()
			untracked(() => this.closeDetail())
		})
	}
	closeDetail() {
		this.detailVersion++
		this.selected.set(null)
		this.detail.set(null)
		this.detailLoading.set(false)
		this.detailError.set('')
	}
	async openDetail(row: ProspectoRow) {
		const version = ++this.detailVersion
		this.selected.set(row)
		this.detail.set(null)
		this.detailError.set('')
		this.detailLoading.set(true)
		try {
			const detail = await firstValueFrom(this.store.api.detail(row.clienteId))
			if (version === this.detailVersion) this.detail.set(detail)
		} catch {
			if (version === this.detailVersion) this.detailError.set('No se pudo cargar el detalle. Vuelve a intentarlo.')
		} finally {
			if (version === this.detailVersion) this.detailLoading.set(false)
		}
	}
}
