import { Routes } from '@angular/router'
export const leadsRoutes: Routes = [
    {
        path: 'leads',
        loadComponent: () => import('./pages/leads/leads').then((m) => m.Leads),
        data: { breadcrumb: 'Leads' },
        title: 'Leads | CRM V3',
    },
]
