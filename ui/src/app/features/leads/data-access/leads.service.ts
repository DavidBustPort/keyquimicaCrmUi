import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AuthStore } from '@app/core/auth/auth.store'
import { RikFilterStore } from '@app/core/filters/rik-filter.store'
import { LeadsApiService } from './leads-api.service'
import { LeadCatalog, LeadsQuery, mapLead } from '../models/leads-api.model'
import { Lead } from '../models/lead'
import { catchError, firstValueFrom, of, Subject, switchMap, Observable } from 'rxjs'
@Injectable()
export class LeadsService {
    readonly auth = inject(AuthStore)
    private readonly api = inject(LeadsApiService)
    private readonly rikFilter = inject(RikFilterStore)
    readonly leads = signal<Lead[]>([])
    readonly total = signal(0)
    readonly page = signal(1)
    readonly size = signal(10)
    readonly search = signal('')
    readonly selectedId = signal<number | null>(null)
    readonly selected = computed(() => this.leads().find((l) => l.id === this.selectedId()) ?? null)
    readonly isLoading = signal(false)
    readonly saving = signal(false)
    readonly error = signal('')
    readonly notice = signal('')
    readonly branches = signal<LeadCatalog[]>([])
    readonly reps = signal<LeadCatalog[]>([])
    readonly allowed = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral())
    private readonly requests = new Subject<LeadsQuery | null>()
    private scope = ''
    constructor() {
        this.requests
            .pipe(
                switchMap((query) =>
                    query
                        ? this.api.getLeads(query).pipe(catchError((error) => of({ error })))
                        : of(null),
                ),
                takeUntilDestroyed(),
            )
            .subscribe((result) => {
                this.isLoading.set(false)
                if (!result) return
                if ('error' in result) {
                    this.error.set(
                        result.error instanceof Error
                            ? result.error.message
                            : 'No se pudieron cargar los leads.',
                    )
                    return
                }
                const lastPage = Math.max(1, Math.ceil(result.totalRows / this.size()))
                if (this.page() > lastPage) {
                    this.page.set(lastPage)
                    this.refresh()
                    return
                }
                this.leads.set(result.data.map(mapLead))
                this.total.set(result.totalRows)
            })
        effect(() => {
            const allowed = this.allowed(),
                manager = this.auth.isManager(),
                session = this.auth.session(),
                rik = manager ? this.rikFilter.selectedRikId() : null
            const scope = JSON.stringify([
                allowed,
                manager,
                session.userId,
                session.sucursalId,
                rik,
            ])
            if (scope === this.scope) return
            this.scope = scope
            this.page.set(1)
            this.selectedId.set(null)
            this.notice.set('')
            untracked(() => this.refresh())
        })
    }
    refresh() {
        this.error.set('')
        this.leads.set([])
        this.total.set(0)
        if (!this.allowed()) {
            this.isLoading.set(false)
            this.requests.next(null)
            return
        }
        this.isLoading.set(true)
        this.requests.next({
            page: this.page(),
            itemsPerPage: this.size(),
            filter: this.search().trim(),
            isManager: this.auth.isManager(),
            rikId: this.auth.isManager() ? this.rikFilter.selectedRikId() : null,
        })
    }
    setSearch(value: string) {
        this.search.set(value)
        this.page.set(1)
        this.selectedId.set(null)
        this.refresh()
    }
    setPage(page: number) {
        this.page.set(page)
        this.selectedId.set(null)
        this.refresh()
    }
    setSize(size: number) {
        this.size.set(size)
        this.setPage(1)
    }
    async loadCatalog(mode: 'sucursal' | 'representante') {
        this.requireManager()
        if (mode === 'sucursal') this.branches.set([])
        else this.reps.set([])
        const rows = await firstValueFrom(
            mode === 'sucursal' ? this.api.getSucursales() : this.api.getRiks(),
        )
        if (!this.allowed() || !this.auth.isManager()) return
        if (mode === 'sucursal') this.branches.set(rows)
        else this.reps.set(rows)
    }
    private requireManager() {
        if (!this.allowed() || !this.auth.isManager())
            throw new Error('Esta acción solo está disponible para el gerente de sucursal.')
    }
    async changeBranch(id: number, value: string) {
        this.requireManager()
        if (!this.branches().some((b) => String(b.id) === value))
            throw new Error('Selecciona una sucursal válida.')
        if (this.selected()?.sucursalId === value)
            throw new Error('Selecciona una sucursal diferente a la actual.')
        await this.save(
            this.api.changeBranch(id, Number(value)),
            'Sucursal actualizada correctamente.',
        )
    }
    async assign(id: number, value: string) {
        this.requireManager()
        if (!this.reps().some((r) => String(r.id) === value))
            throw new Error('Selecciona un RIK válido.')
        await this.save(this.api.assign(id, Number(value)), 'RIK asignado correctamente.')
    }
    async reject(id: number, type: number, reason: string) {
        this.requireManager()
        if (![2, 4, 5, 3].includes(type)) throw new Error('Selecciona un tipo de rechazo válido.')
        if (type === 3 && (!reason.trim() || reason.trim().length > 500))
            throw new Error('Especifica un motivo de entre 1 y 500 caracteres.')
        await this.save(
            this.api.reject(id, type, type === 3 ? reason.trim() : null),
            'Lead rechazado correctamente.',
        )
    }
    private async save(request: Observable<boolean>, message: string) {
        if (this.saving()) throw new Error('Hay una operación en curso.')
        this.saving.set(true)
        try {
            await firstValueFrom(request)
            this.notice.set(message)
            this.selectedId.set(null)
            this.refresh()
        } finally {
            this.saving.set(false)
        }
    }
}
