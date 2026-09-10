import { Routes } from '@angular/router'
import type { Oportunidades } from './pages/oportunidades/oportunidades'
const opportunity = () => import('./pages/oportunidades/oportunidades').then((m) => m.Oportunidades)
// Angular requires an explicit route for each optional parameter combination.
export const oportunidadesRoutes: Routes = [
    {
        path: 'oportunidades-proyectos',
        data: { breadcrumb: 'Oportunidades de Proyectos' },
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/embudo-list/embudo-list').then((m) => m.EmbudoList),
                data: { breadcrumb: 'Embudo de Proyectos', canExpandContainer: true },
                title: 'Embudo de Proyectos | CRM V3',
            },
            ...[
                'oportunidades/:prospectoId/:oportunidadId',
                'oportunidades/:prospectoId',
                'oportunidades',
            ].map((path) => ({
                path,
                loadComponent: opportunity,
                canDeactivate: [(component: Oportunidades) => component.confirmNavigation()],
                data: { breadcrumb: 'Oportunidades' },
                title: 'Oportunidades | CRM V3',
            })),
        ],
    },
]
