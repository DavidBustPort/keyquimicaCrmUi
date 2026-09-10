import { Component, input } from '@angular/core'
@Component({ selector: 'app-form-field', templateUrl: './form-field.html' })
export class FormField {
    readonly label = input.required<string>()
    readonly forId = input.required<string>()
    readonly required = input(false)
    readonly error = input('')
}
