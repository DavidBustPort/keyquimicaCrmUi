import { Component, computed, input } from '@angular/core'
@Component({
    selector: 'app-progress-gauge',
    templateUrl: './progress-gauge.html',
})
export class ProgressGauge {
    readonly value = input(0)
    readonly goal = input(0)
    readonly label = input('Cumplimiento')
    readonly color = input('#168664')
    readonly percent = computed(() =>
        this.goal() > 0 ? Math.max(0, Math.round((this.value() / this.goal()) * 100)) : 0,
    )
    readonly fill = computed(() => Math.min(100, this.percent()))
}
