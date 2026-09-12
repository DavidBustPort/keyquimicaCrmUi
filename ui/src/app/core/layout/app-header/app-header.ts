import { Component, computed, inject, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { UserRole } from '../../auth/auth.model'
import { AuthStore } from '../../auth/auth.store'
import { RikFilterStore } from '../../filters/rik-filter.store'
import { LoadingService } from '../../loading/loading.service'
@Component({
    host: { class: 'block sticky top-[0] z-[20]' },
    selector: 'app-header',
    imports: [FormsModule],
    templateUrl: './app-header.html',
})
export class AppHeader {
    readonly auth = inject(AuthStore)
    readonly rikFilter = inject(RikFilterStore)
    readonly loading = inject(LoadingService)
    readonly showFilterByRik = input(false)
    readonly desktopOpen = input(true)
    readonly mobileOpen = input(false)
    readonly canExpand = input(false)
    readonly expanded = input(false)
    readonly menuToggle = output<void>()
    readonly expandToggle = output<void>()
    readonly user = computed(() => {
        const session = this.auth.session()
        const name = session.userName?.trim() || 'Usuario'
        const words = name.split(/\s+/)
        const initials = (
            words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')
        ).toLocaleUpperCase('es-MX')
        const role = !session.loggedIn
            ? 'Sin sesión'
            : session.sucursalId === null
              ? 'Oficina central'
              : session.role === UserRole.Manager
                ? 'Gerente'
                : session.role === UserRole.Rik
                  ? 'Representante'
                  : session.role || 'Usuario'
        return { name, initials, role }
    })
}
