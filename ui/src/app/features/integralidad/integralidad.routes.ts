import { Routes } from '@angular/router'
export const integralidadRoutes: Routes = [
	{
		path: 'integralidad',
		loadComponent: () => import('./pages/integralidad/integralidad').then((m) => m.Integralidad),
		data: { breadcrumb: 'Integralidad', modes: ['sucursal'], showFilterByRik: true, canExpandContainer: false, expandedByDefault: true },
		title: 'Integralidad | CRM V3'
	}
]
