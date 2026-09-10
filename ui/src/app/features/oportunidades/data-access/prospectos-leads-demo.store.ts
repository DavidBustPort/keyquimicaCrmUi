export const SUCURSALES = [
	{ value: '1', label: 'Chihuahua Norte', ciudad: 'Chihuahua' },
	{ value: '2', label: 'Chihuahua Sur', ciudad: 'Chihuahua' },
	{ value: '3', label: 'Ciudad Juárez', ciudad: 'Ciudad Juárez' }
]
export const REPRESENTANTES = [
	{ value: '1', label: 'Ana Torres', sucursalId: '1' },
	{ value: '2', label: 'Luis Mendoza', sucursalId: '1' },
	{ value: '3', label: 'María García', sucursalId: '2' },
	{ value: '4', label: 'Carlos Molina', sucursalId: '2' },
	{ value: '5', label: 'Sofía Reyes', sucursalId: '3' }
]
import { Injectable, signal } from '@angular/core'
import { Lead, LeadView } from '@features/leads/models/lead'

const empresas = [
	'Hotel Mirador',
	'Clínica San Miguel',
	'Alimentos Las Cumbres',
	'Taller Industrial Atlas',
	'Restaurante El Encino',
	'Hotel Alameda',
	'Clínica Los Pinos',
	'Comedor Valle Verde',
	'Hotel Las Torres',
	'Manufacturas del Centro',
	'Cocina del Parque',
	'Hospital San Lucas'
]
@Injectable({ providedIn: 'root' })
export class ProspectosLeadsDemoStore {
	readonly view = signal<LeadView>('representante')
	readonly representanteActual = '1'
	readonly notice = signal('')
	readonly leads = signal<Lead[]>(
		empresas.map((empresa, i) => ({
			id: 101 + i,
			empresa,
			contacto: ['Sofía Reyes', 'Carlos Molina', 'Laura Méndez'][i % 3],
			correo: 'lead' + (i + 1) + '@example.com',
			telefono: '614 555 ' + String(2000 + i),
			fecha: '2026-09-' + String(i + 1).padStart(2, '0'),
			medio: ['Sitio web', 'Evento', 'Referido'][i % 3],
			segmento: ['Hotelería', 'Salud', 'Industria'][i % 3],
			producto: 'Soluciones de higiene profesional',
			comentarios: 'Solicita información y una visita para evaluar sus necesidades.',
			ciudad: i === 9 ? 'Ciudad Juárez' : 'Chihuahua',
			sucursalId: i === 9 ? '3' : '1',
			representanteId: i === 6 || i === 9 ? '' : i >= 10 ? '2' : '1',
			estado: i < 6 ? 'Disponible' : i === 6 || i === 9 ? 'Pendiente' : i === 7 || i === 10 ? 'Desarrollado' : 'Rechazado',
			motivo: i === 8 || i === 11 ? 'El prospecto decidió no seguir (por costo)' : undefined,
			rechazadoPor: i === 8 || i === 11 ? 'gerente' : undefined
		}))
	)
	get(id: number) {
		const lead = this.leads().find((item) => item.id === id)
		if (!lead) throw new Error('El lead no existe.')
		return lead
	}
	private active(id: number) {
		const lead = this.get(id)
		if (lead.estado === 'Desarrollado' || lead.estado === 'Rechazado') throw new Error('Este lead ya fue desarrollado o rechazado.')
		return lead
	}
	private manager() {
		if (this.view() !== 'gerente') throw new Error('Esta acción está disponible en la vista de gerente.')
	}
	changeBranch(id: number, sucursalId: string) {
		this.manager()
		const lead = this.active(id)
		const branch = SUCURSALES.find((item) => item.value === sucursalId)
		if (!branch) throw new Error('Selecciona una sucursal válida.')
		if (lead.sucursalId === sucursalId) return
		this.leads.update((rows) => rows.map((item) => (item.id === id ? { ...item, sucursalId, representanteId: '', estado: 'Pendiente' } : item)))
		this.notice.set('Sucursal actualizada. Asigna un representante de la nueva sucursal.')
	}
	assign(id: number, representanteId: string) {
		this.manager()
		const lead = this.active(id)
		if (!REPRESENTANTES.some((item) => item.value === representanteId && item.sucursalId === lead.sucursalId)) throw new Error('Selecciona un representante de la sucursal del lead.')
		this.leads.update((rows) => rows.map((item) => (item.id === id ? { ...item, representanteId, estado: 'Disponible' } : item)))
		this.notice.set('Representante asignado correctamente.')
	}
	reject(id: number, motivo: string, actor: 'gerente' | 'representante' = 'gerente') {
		if (actor === 'gerente') this.manager()
		const lead = this.active(id)
		if (actor === 'representante' && (lead.estado !== 'Disponible' || lead.representanteId !== this.representanteActual)) throw new Error('Este lead no está asignado al representante actual.')
		if (!motivo.trim()) throw new Error('Especifica el motivo de rechazo.')
		this.leads.update((rows) => rows.map((item) => (item.id === id ? { ...item, estado: 'Rechazado', motivo: motivo.trim(), rechazadoPor: actor } : item)))
		this.notice.set('Lead rechazado correctamente.')
	}
	canDevelop(id: number) {
		return this.leads().some((lead) => lead.id === id && lead.estado === 'Disponible' && lead.representanteId === this.representanteActual)
	}
	develop(id: number) {
		if (!this.canDevelop(id)) throw new Error('Este lead ya no está disponible para el representante actual.')
		this.leads.update((rows) => rows.map((item) => (item.id === id ? { ...item, estado: 'Desarrollado' } : item)))
	}
}
