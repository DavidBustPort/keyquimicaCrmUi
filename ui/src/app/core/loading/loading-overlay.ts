import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { LoadingService } from './loading.service'

@Component({
    selector: 'app-loading-overlay',
    template: `
        @if (loadingService.isLoading()) {
            <div
                class="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px] dark:bg-black/40"
            >
                <div
                    class="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-lg dark:bg-zinc-900"
                >
                    <span
                        class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
                    ></span>
                    <span class="text-sm font-medium text-slate-700 dark:text-zinc-200"
                        >Procesando...</span
                    >
                </div>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlay {
    protected readonly loadingService = inject(LoadingService)
}
