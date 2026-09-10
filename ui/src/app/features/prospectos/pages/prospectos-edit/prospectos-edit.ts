import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { map } from 'rxjs'
import { ProspectoForm } from '@features/prospectos/components/prospecto-form/prospecto-form'
@Component({
    selector: 'app-prospectos-edit',
    imports: [ProspectoForm],
    templateUrl: './prospectos-edit.html',
})
export class ProspectosEdit {
    readonly id = toSignal(
        inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
        { initialValue: 0 },
    )
}
