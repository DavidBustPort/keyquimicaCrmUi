import { Component, computed, inject, output, signal } from '@angular/core'
import { Router, RouterLink, RouterLinkActive } from '@angular/router'
import { AuthStore } from '../../auth/auth.store'
@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './app-sidebar.html',
})
export class AppSidebar {
    private readonly auth = inject(AuthStore)
    readonly visibleItems = computed(() =>
        this.items.filter(
            (item) =>
                item.path !== '/leads' ||
                (this.auth.isFullyAuthenticated() && !this.auth.isCentral()),
        ),
    )
    readonly router = inject(Router)
    readonly navigated = output<void>()
    readonly closed = output<void>()
    readonly reportsOpen = signal<boolean | null>(null)
    isReportsOpen() {
        return this.reportsOpen() ?? this.isReport()
    }
    readonly items = [
        { label: 'Inicio', path: '/', icon: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9' },
        {
            label: 'Prospectos',
            path: '/prospectos',
            icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6m-3-3h6',
        },
        {
            label: 'Oportunidades de Proyectos',
            path: '/oportunidades-proyectos',
            icon: 'M9 3h6v6H9zM3 15h6v6H3zM15 15h6v6h-6zM12 9v3M6 15v-3h12v3',
        },
        { label: 'Leads', path: '/leads', icon: 'M4 4h16l2 11v5H2v-5L4 4zM2 15h6l2 3h4l2-3h6' },
    ]
    readonly reports = [
        { label: 'Gestión de Oportunidades', path: '/gestion-proyectos' },
        { label: 'Reporte de estado comercial', path: '/tracking-cerrados' },
        { label: 'Prospección', path: '/prospeccion' },
    ]
    isReport() {
        const path = this.router.url.split('?')[0].split('#')[0]
        return path.startsWith('/reportes') || this.reports.some((report) => path === report.path)
    }
}
