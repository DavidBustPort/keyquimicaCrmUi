import { Component, computed, input, output } from '@angular/core'
@Component({ selector: 'app-pagination', templateUrl: './pagination.html' })
export class Pagination {
    readonly total = input(0)
    readonly page = input(1)
    readonly size = input(10)
    readonly sizes = input<readonly number[]>([5, 10, 20, 50])
    readonly pageChange = output<number>()
    readonly sizeChange = output<number>()
    readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())))
    readonly start = computed(() => (this.total() ? (this.page() - 1) * this.size() + 1 : 0))
    readonly end = computed(() => Math.min(this.page() * this.size(), this.total()))
}
