import { computed, effect, inject, Injectable, resource, signal, untracked } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '../auth/auth.store'
import { RikFilterApiService } from './rik-filter-api.service'

@Injectable({
	providedIn: 'root'
})
export class RikFilterStore {
	private readonly auth = inject(AuthStore)
	private readonly api = inject(RikFilterApiService)
	private readonly selection = signal<{ session: string; id: number | null } | null>(null)
	private readonly sessionKey = computed(() => {
		if (!this.auth.isFullyAuthenticated() || !this.auth.isManager()) return undefined
		const session = this.auth.session()
		return `${session.userId}:${session.sucursalId}`
	})
	readonly catalog = resource({
		params: () => this.sessionKey(),
		loader: () => firstValueFrom(this.api.getRiks())
	})
	readonly riks = computed(() => (this.catalog.hasValue() ? this.catalog.value() : []))
	readonly selectedRikId = computed(() => (this.sessionKey() && this.selection()?.session === this.sessionKey() ? this.selection()!.id : null))
	constructor() {
		effect(() => {
			this.sessionKey()
			untracked(() => this.selection.set(null))
		})
	}
	select(id: number | null) {
		const session = this.sessionKey()
		if (!session || (id !== null && !this.riks().some((rik) => rik.id === id))) return
		this.selection.set({ session, id })
	}
}
