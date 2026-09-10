import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { map } from 'rxjs'
import { ProspectoForm } from '@features/prospectos/components/prospecto-form/prospecto-form'
@Component({
	selector: 'app-prospectos-add',
	imports: [ProspectoForm],
	templateUrl: './prospectos-add.html'
})
export class ProspectosAdd {
	readonly leadId = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((params) => (params.has('leadId') ? Number(params.get('leadId')) : undefined))))
}
