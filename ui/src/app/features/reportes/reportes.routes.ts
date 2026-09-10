import { Routes } from '@angular/router'
const reports: Routes = [
    {
        path: 'gestion-proyectos',
        loadComponent: () =>
            import('./pages/gestion-proyectos/gestion-proyectos').then((m) => m.GestionProyectos),
        data: { breadcrumb: 'Gestión de Oportunidades' },
        title: 'Gestión de Oportunidades | CRM V3',
    },
    {
        path: 'tracking-cerrados',
        loadComponent: () =>
            import('./pages/tracking-cerrados/tracking-cerrados').then((m) => m.TrackingCerrados),
        data: { breadcrumb: 'Reporte de estado comercial', width: 'medium' },
        title: 'Reporte de estado comercial | CRM V3',
    },
    {
        path: 'prospeccion',
        loadComponent: () => import('./pages/prospeccion/prospeccion').then((m) => m.Prospeccion),
        data: { breadcrumb: 'Prospección', width: 'medium' },
        title: 'Prospección | CRM V3',
    },
]
export const reportesRoutes: Routes = [
    {
        path: 'reportes',
        data: { breadcrumb: 'Reportes' },
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./pages/reportes/reportes').then((m) => m.Reportes),
                title: 'Reportes | CRM V3',
            },
            ...reports.map((route) => ({
                path: route.path,
                redirectTo: '/' + route.path,
                pathMatch: 'full' as const,
            })),
        ],
    },
    { path: '', data: { breadcrumb: 'Reportes' }, children: reports },
]
