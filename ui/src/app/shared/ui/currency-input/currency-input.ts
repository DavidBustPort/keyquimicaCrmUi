import { Component, input } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { FormField } from '@shared/ui/form-field/form-field'
@Component({
    selector: 'app-currency-input',
    imports: [ReactiveFormsModule, FormField],
    templateUrl: './currency-input.html',
})
export class CurrencyInput {
    readonly control = input.required<FormControl<number>>()
    readonly fieldId = input('vpo')
    readonly label = input('VPO')
    readonly error = input('')
}
