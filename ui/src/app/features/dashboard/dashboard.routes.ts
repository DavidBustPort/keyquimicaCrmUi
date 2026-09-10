import { Routes } from '@angular/router'

export const dashboardRoutes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
		data: {
			breadcrumb: 'Inicio',
			showFilterByRik: false
		},
		title: 'Inicio | CRM V3'
	}
]
