import { integralidadRoutes } from './features/integralidad/integralidad.routes'
import { Routes } from '@angular/router'
import { Layout } from './core/layout/layout'
import { dashboardRoutes } from './features/dashboard/dashboard.routes'
import { prospectosRoutes } from './features/prospectos/prospectos.routes'
import { oportunidadesRoutes } from './features/oportunidades/oportunidades.routes'
import { leadsRoutes } from './features/leads/leads.routes'
import { reportesRoutes } from './features/reportes/reportes.routes'

export const routes: Routes = [
	{
		path: '',
		component: Layout,
		children: [
			...dashboardRoutes,
			...prospectosRoutes,
			...oportunidadesRoutes,
			...leadsRoutes,
			...reportesRoutes,
			...integralidadRoutes,
			{
				path: 'no-access',
				loadComponent: () => import('./core/pages/no-access/no-access').then((m) => m.NoAccess),
				data: {
					breadcrumb: 'Sin acceso'
				},
				title: 'Sin acceso | CRM V3'
			},
			{
				path: '**',
				redirectTo: ''
			}
		]
	}
]
