import { Component, input, output } from '@angular/core'
@Component({
    host: { class: 'block sticky top-[0] z-[20]' },
    selector: 'app-header',
    templateUrl: './app-header.html',
})
export class AppHeader {
    readonly desktopOpen = input(true)
    readonly mobileOpen = input(false)
    readonly canExpand = input(false)
    readonly expanded = input(false)
    readonly menuToggle = output<void>()
    readonly expandToggle = output<void>()
    readonly user = { name: 'Usuario demo', initials: 'UD', role: 'Representante' }
}
