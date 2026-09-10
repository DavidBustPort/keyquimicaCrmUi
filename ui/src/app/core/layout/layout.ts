import { Component, inject, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { AppHeader } from './app-header/app-header'
import { AppSidebar } from './app-sidebar/app-sidebar'
@Component({
    host: { class: 'block' },
    selector: 'app-layout',
    imports: [AppHeader, AppSidebar, RouterOutlet, RouterLink],
    templateUrl: './layout.html',
    styleUrl: './layout.css',
})
export class Layout {
    private readonly router = inject(Router)
    readonly desktopCollapsed = signal(false)
    readonly mobileOpen = signal(false)
    readonly expanded = signal(false)
    readonly page = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            startWith(null),
            map(() => {
                this.mobileOpen.set(false)
                this.expanded.set(false)
                let route = this.router.routerState.snapshot.root
                const segments: string[] = []
                const crumbs: { label: string; path: string }[] = []
                let canExpand = false
                let width = ''
                while (route.firstChild) {
                    route = route.firstChild
                    segments.push(...route.url.map((segment) => segment.path))
                    if (route.data['breadcrumb'])
                        crumbs.push({
                            label: route.data['breadcrumb'],
                            path: '/' + segments.join('/'),
                        })
                    canExpand = route.data['canExpandContainer'] ?? false
                    width = route.data['width'] ?? ''
                }
                return { crumbs, canExpand, width }
            }),
        ),
    )
    toggleSidebar() {
        if (window.matchMedia('(max-width: 991px)').matches) this.mobileOpen.update((open) => !open)
        else this.desktopCollapsed.update((collapsed) => !collapsed)
    }
}
