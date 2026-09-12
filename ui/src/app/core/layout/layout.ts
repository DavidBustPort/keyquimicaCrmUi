import { Component, inject, signal } from '@angular/core'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { AppHeader } from './app-header/app-header'
import { AppSidebar } from './app-sidebar/app-sidebar'
@Component({
	host: { class: 'block' },
	selector: 'app-layout',
	imports: [AppHeader, AppSidebar, RouterOutlet],
	templateUrl: './layout.html',
	styleUrl: './layout.css'
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
				let canExpand = false
				let expandedByDefault = false
				let width = ''
				let showFilterByRik = false
				while (route.firstChild) {
					route = route.firstChild
					canExpand = route.data['canExpandContainer'] ?? false
					expandedByDefault = route.data['expandedByDefault'] === true
					width = route.data['width'] ?? ''
					showFilterByRik = route.data['showFilterByRik'] === true
				}
				this.expanded.set(expandedByDefault)
				return { canExpand, width, showFilterByRik }
			})
		)
	)
	toggleSidebar() {
		if (window.matchMedia('(max-width: 991px)').matches) this.mobileOpen.update((open) => !open)
		else this.desktopCollapsed.update((collapsed) => !collapsed)
	}
}
