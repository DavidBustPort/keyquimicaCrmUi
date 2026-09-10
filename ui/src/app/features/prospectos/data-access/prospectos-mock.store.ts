import { Injectable, inject, signal } from '@angular/core'
import { Prospecto, ProspectoFormValue } from '@features/prospectos/models/prospecto'
import { ProspectosLeadsDemoStore } from './prospectos-leads-demo.store'
export const UENS = [
    { value: '1', label: 'Institucional' },
    { value: '2', label: 'Industrial' },
    { value: '3', label: 'Alimentos y bebidas' },
]
export const SEGMENTOS = [
    { value: '11', label: 'Hotelería', uenId: '1' },
    { value: '12', label: 'Hospitales', uenId: '1' },
    { value: '21', label: 'Manufactura', uenId: '2' },
    { value: '22', label: 'Automotriz', uenId: '2' },
    { value: '31', label: 'Restaurantes', uenId: '3' },
    { value: '32', label: 'Procesamiento de alimentos', uenId: '3' },
]
export const TIPOS_CLIENTE = [
    { value: '1', label: 'Cliente nuevo' },
    { value: '2', label: 'Cliente actual' },
]
export const TERRITORIOS = [
    { value: '1', label: 'Chihuahua Norte' },
    { value: '2', label: 'Chihuahua Sur' },
    { value: '3', label: 'Ciudad Juárez' },
]
export const ETAPAS = ['Análisis', 'Promoción', 'Negociación', 'Cierre']
const companies = [
    'Hotel Sierra Norte',
    'Clínica del Valle',
    'Manufacturas Horizonte',
    'Restaurante La Terraza',
    'Alimentos del Desierto',
    'Automotriz del Norte',
    'Hospital Santa Elena',
    'Hotel Puerta Real',
    'Comedor Los Olivos',
    'Empaques del Pacífico',
    'Cocina Central',
    'Industrias del Sol',
]
@Injectable({ providedIn: 'root' })
export class ProspectosMockStore {
    readonly notice = signal('')
    readonly prospectos = signal<Prospecto[]>(
        companies.map((razonSocial, i) => ({
            id: 42 + i,
            razonSocial,
            contacto: ['Ana Torres', 'Luis Mendoza', 'María García'][i % 3],
            correo: 'contacto' + (i + 1) + '@example.com',
            telefono: '614 555 ' + String(1000 + i),
            uenId: String((i % 3) + 1),
            segmentoId: ['11', '21', '31'][i % 3],
            tipoClienteId: '1',
            territorioId: i % 4 === 2 ? '' : String((i % 3) + 1),
            vpo: 15000 + i * 7250,
            observaciones: 'Seguimiento a propuesta de soluciones de limpieza.',
            fuente: i % 4 === 0 ? 'LD' : 'TD',
            fecha: '2026-' + (i % 3 === 0 ? '08' : '09') + '-' + String(i + 1).padStart(2, '0'),
            estatus: i % 5 === 0 ? 'Cerrado' : 'Abierto',
            registro: i % 4 !== 2,
            etapaLead: i % 2 ? 'gte' : 'rik',
            gteEstatus: 'Enviado',
            rikEstatus: i % 2 ? 'No Procesado' : 'Procesado',
            etapas: ETAPAS.map((nombre, j) => ({
                nombre,
                proyectos: j === i % 4 ? (i % 3) + 1 : 0,
                importe: j === i % 4 ? 15000 + i * 7250 : 0,
            })),
        })),
    )
    readonly leadsStore = inject(ProspectosLeadsDemoStore)
    readonly leads = this.leadsStore.leads
    save(value: ProspectoFormValue, id?: number, leadId?: number) {
        if (id !== undefined) {
            const existing = this.prospectos().find((p) => p.id === id)
            if (!existing) throw new Error('El prospecto no existe.')
            this.prospectos.update((rows) =>
                rows.map((p) => (p.id === id ? { ...p, ...value, registro: true } : p)),
            )
            this.notice.set('Prospecto actualizado correctamente.')
            return id
        }
        if (leadId && !this.leadsStore.canDevelop(leadId))
            throw new Error('Este lead ya no está disponible.')
        const nextId = Math.max(0, ...this.prospectos().map((p) => p.id)) + 1
        this.prospectos.update((rows) => [
            {
                ...value,
                id: nextId,
                fuente: leadId ? 'LD' : 'TD',
                leadId,
                fecha: new Date().toISOString().slice(0, 10),
                estatus: 'Abierto',
                registro: true,
                etapaLead: leadId ? 'rik' : '',
                gteEstatus: leadId ? 'Enviado' : '—',
                rikEstatus: leadId ? 'Procesado' : '—',
                etapas: ETAPAS.map((nombre) => ({ nombre, proyectos: 0, importe: 0 })),
            },
            ...rows,
        ])
        if (leadId) this.leadsStore.develop(leadId)
        this.notice.set('Prospecto creado correctamente.')
        return nextId
    }
    rejectLead(id: number, motivo: string) {
        this.leadsStore.reject(id, motivo, 'representante')
    }
}
