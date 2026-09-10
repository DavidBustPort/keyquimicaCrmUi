import { computed, Injectable, signal } from '@angular/core'

@Injectable({
    providedIn: 'root',
})
export class LoadingService {
    private readonly count = signal<number>(0)

    readonly isLoading = computed(() => this.count() > 0)

    show(): void {
        this.count.update((value) => value + 1)
    }

    hide(): void {
        this.count.update((value) => Math.max(0, value - 1))
    }

    async wrap<T>(promise: Promise<T>): Promise<T> {
        this.show()
        try {
            return await promise
        } finally {
            this.hide()
        }
    }
}
