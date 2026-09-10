import { Component, input } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { FormField } from '@shared/ui/form-field/form-field'
export interface SelectOption {
    value: string
    label: string
}
@Component({
    selector: 'app-select-field',
    imports: [ReactiveFormsModule, FormField],
    templateUrl: './select-field.html',
})
export class SelectField {
    readonly label = input.required<string>()
    readonly fieldId = input.required<string>()
    readonly control = input.required<FormControl<string>>()
    readonly options = input.required<readonly SelectOption[]>()
    readonly placeholder = input('Seleccionar')
    readonly required = input(false)
    readonly error = input('')
}
