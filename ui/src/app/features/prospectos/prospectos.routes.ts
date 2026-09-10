import { Routes } from '@angular/router'
export const prospectosRoutes: Routes = [
    {
        path: 'prospectos',
        data: { breadcrumb: 'Prospectos' },
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/prospectos-list/prospectos-list').then((m) => m.ProspectosList),
                data: { breadcrumb: 'Lista de Prospectos', canExpandContainer: true },
                title: 'Prospectos | CRM V3',
            },
            {
                path: 'add',
                loadComponent: () =>
                    import('./pages/prospectos-add/prospectos-add').then((m) => m.ProspectosAdd),
                data: { breadcrumb: 'Nuevo Prospecto', width: 'narrow' },
                title: 'Nuevo Prospecto | CRM V3',
            },
            {
                path: 'edit/:id',
                loadComponent: () =>
                    import('./pages/prospectos-edit/prospectos-edit').then((m) => m.ProspectosEdit),
                data: { breadcrumb: 'Editar Prospecto', width: 'narrow' },
                title: 'Editar Prospecto | CRM V3',
            },
        ],
    },
]
