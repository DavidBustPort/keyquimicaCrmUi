import { routeAccessGuard } from '@app/core/auth/route-access.guard'
import { Routes } from '@angular/router'
export const leadsRoutes: Routes = [
    {
        path: 'leads',
        loadComponent: () => import('./pages/leads/leads').then((m) => m.Leads),
        canActivate: [routeAccessGuard],
        data: { breadcrumb: 'Leads', modes: ['sucursal'], showFilterByRik: true },
        title: 'Leads | CRM V3',
    },
]
