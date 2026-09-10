import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MultiSelect } from '@shared/ui/multi-select/multi-select'
import {
    BRANCHES,
    GROUPS,
    REPS,
    DashboardMockStore,
} from '@features/dashboard/data-access/dashboard-mock.store'
import { DashboardFilter } from '@features/dashboard/models/dashboard'
@Component({
    selector: 'app-dashboard-filters',
    imports: [FormsModule, MultiSelect],
    templateUrl: './dashboard-filters.html',
})
export class DashboardFilters {
    readonly store = inject(DashboardMockStore)
    readonly draft = signal<DashboardFilter>({ ...this.store.filter() })
    readonly groups = GROUPS
    readonly branches = computed(() => BRANCHES.filter((b) => b.group === this.draft().group))
    readonly reps = computed(() => REPS.filter((r) => this.draft().branches.includes(r.branch)))
    update(field: 'start' | 'end', value: string) {
        this.draft.update((f) => ({ ...f, [field]: value }))
    }
    mode(value: DashboardFilter['mode']) {
        this.draft.update((f) => ({ ...f, mode: value }))
        this.selectBranches(value === 'central' ? this.branches().map((b) => b.value) : ['1'])
    }
    group(value: string) {
        this.draft.update((f) => ({ ...f, group: value }))
        this.selectBranches(this.branches().map((b) => b.value))
    }
    selectBranches(branches: string[]) {
        this.draft.update((f) => ({
            ...f,
            branches,
            representatives: REPS.filter((r) => branches.includes(r.branch)).map((r) => r.value),
        }))
    }
    selectReps(representatives: string[]) {
        this.draft.update((f) => ({ ...f, representatives }))
    }
    apply() {
        this.store.apply(this.draft())
    }
}
