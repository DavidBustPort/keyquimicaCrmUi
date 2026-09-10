import { Injectable, computed, inject, signal } from '@angular/core'
import { ProspectosMockStore } from '@features/prospectos/data-access/prospectos-mock.store'
import {
    AltaProyecto,
    Etapa,
    Oportunidad,
    ProductoProyecto,
} from '@features/oportunidades/models/oportunidad'
import { APLICACIONES, AREAS, ETAPAS, PRODUCTOS, SOLUCIONES } from './oportunidades.catalogos'
const positive = (value: number) => Number.isFinite(value) && value > 0
export const montoProyecto = (p: Oportunidad) =>
    Math.round(
        p.productos.reduce((total, item) => total + item.cantidad * item.precioVenta, 0) * 100,
    ) / 100
export const tienePendientes = (p: Oportunidad) => p.productos.some((item) => item.pendiente)
export const esEditable = (p: Oportunidad) =>
    p.etapa !== 'Cierre' && p.etapa !== 'Cancelada' && !tienePendientes(p)
@Injectable({ providedIn: 'root' })
export class OportunidadesMockStore {
    readonly prospectosStore = inject(ProspectosMockStore)
    readonly notice = signal('')
    readonly dimensiones = signal<Record<number, number>>({
        42: 100,
        43: 80,
        45: 120,
        46: 70,
        47: 50,
        49: 60,
        50: 100,
        51: 80,
        53: 60,
    })
    readonly proyectos = signal<Oportunidad[]>(
        Array.from({ length: 12 }, (_, i) => {
            const app = APLICACIONES[i % APLICACIONES.length]
            const solution = SOLUCIONES.find((s) => s.value === app.solucionId)!
            const product = PRODUCTOS[i % PRODUCTOS.length]
            const etapa = ETAPAS[i % ETAPAS.length]
            const products =
                etapa === 'Análisis'
                    ? []
                    : [
                          {
                              ...product,
                              cantidad: 12 + i,
                              precioVenta: product.precioLista,
                              pendiente: false,
                          },
                      ]
            return {
                id: 7 + i,
                prospectoId: [42, 43, 45, 46, 47, 49, 50, 51, 53][i % 9],
                areaId: solution.areaId,
                solucionId: solution.value,
                aplicacionId: app.value,
                tipoVenta: i % 3 === 0 ? 'Esporádica' : 'Instalada',
                vpo: 15000 + i * 3500,
                vpt: 30000 + i * 4000,
                etapa,
                fecha: '2026-' + (i % 3 ? '09' : '08') + '-' + String(i + 1).padStart(2, '0'),
                productos: products,
                acys: etapa === 'Cierre' ? (12 + i) * product.precioLista : 0,
                facturacion: etapa === 'Cierre' ? 2500 + i * 100 : 0,
                motivoCancelacion: etapa === 'Cancelada' ? 'Proyecto pospuesto' : undefined,
            }
        }),
    )
    readonly clientes = computed(() => this.prospectosStore.prospectos())
    dimensionInfo(prospectoId: number) {
        const client = this.clientes().find((p) => p.id === prospectoId)
        return client?.uenId === '1'
            ? { unidad: 'Habitaciones / espacios', valor: 500 }
            : client?.uenId === '2'
              ? { unidad: 'Metros cuadrados', valor: 120 }
              : { unidad: 'Servicios diarios', valor: 250 }
    }
    saveDimension(id: number, value: number) {
        if (!this.clientes().some((c) => c.id === id && c.registro) || !positive(value))
            throw new Error('Completa el prospecto e ingresa una dimensión mayor que cero.')
        this.dimensiones.update((data) => ({ ...data, [id]: value }))
        this.notice.set('Dimensión actualizada.')
    }
    create(data: AltaProyecto) {
        const client = this.clientes().find((c) => c.id === data.prospectoId)
        if (!client?.registro || !positive(this.dimensiones()[data.prospectoId] ?? 0))
            throw new Error('Completa los datos generales y la dimensión antes de crear proyectos.')
        if (
            !AREAS.some((a) => a.value === data.areaId) ||
            !SOLUCIONES.some((s) => s.value === data.solucionId && s.areaId === data.areaId)
        )
            throw new Error('Selecciona un área y una solución válidas.')
        if (
            !data.aplicaciones.length ||
            new Set(data.aplicaciones.map((a) => a.id)).size !== data.aplicaciones.length ||
            data.aplicaciones.some(
                (a) =>
                    !positive(a.vpo) ||
                    !APLICACIONES.some(
                        (item) => item.value === a.id && item.solucionId === data.solucionId,
                    ),
            )
        )
            throw new Error('Selecciona al menos una aplicación con VPO mayor que cero.')
        if (
            data.aplicaciones.some((a) =>
                this.proyectos().some(
                    (p) =>
                        p.prospectoId === data.prospectoId &&
                        p.aplicacionId === a.id &&
                        p.etapa !== 'Cancelada',
                ),
            )
        )
            throw new Error('Una aplicación seleccionada ya tiene un proyecto activo.')
        let next = Math.max(0, ...this.proyectos().map((p) => p.id)) + 1
        const added: Oportunidad[] = data.aplicaciones.map((a) => ({
            id: next++,
            prospectoId: data.prospectoId,
            areaId: data.areaId,
            solucionId: data.solucionId,
            aplicacionId: a.id,
            tipoVenta: data.tipoVenta,
            vpo: a.vpo,
            vpt:
                Math.round(
                    this.dimensiones()[data.prospectoId] *
                        this.dimensionInfo(data.prospectoId).valor *
                        APLICACIONES.find((item) => item.value === a.id)!.potencial,
                ) / 100,
            etapa: 'Análisis',
            fecha: new Date().toISOString().slice(0, 10),
            productos: [],
            acys: 0,
            facturacion: 0,
        }))
        this.proyectos.update((rows) => [...added, ...rows])
        this.notice.set(
            added.length === 1
                ? 'Proyecto creado correctamente.'
                : 'Proyectos creados correctamente.',
        )
        return added
    }
    get(id: number) {
        const p = this.proyectos().find((p) => p.id === id)
        if (!p) throw new Error('El proyecto no existe.')
        return p
    }
    private replace(p: Oportunidad) {
        this.proyectos.update((rows) => rows.map((row) => (row.id === p.id ? p : row)))
    }
    saveProducts(id: number, products: ProductoProyecto[]) {
        const p = this.get(id)
        if (!esEditable(p)) throw new Error('Este proyecto no permite editar sus productos.')
        if (new Set(products.map((x) => x.sku)).size !== products.length)
            throw new Error('Hay productos duplicados.')
        const normalized = products.map((x) => {
            const catalog = PRODUCTOS.find((c) => c.sku === x.sku)
            if (!catalog || !positive(x.cantidad) || !positive(x.precioVenta))
                throw new Error(
                    'Revisa los productos: cantidad y precio deben ser mayores que cero.',
                )
            const pendiente = x.precioVenta < catalog.precioMinimo
            if (
                pendiente &&
                (!x.motivo?.trim() ||
                    !x.justificacion?.trim() ||
                    !x.vigencia ||
                    x.vigencia < new Date().toISOString().slice(0, 10))
            )
                throw new Error(
                    'Completa el motivo, justificación y vigencia de los precios bajo el mínimo.',
                )
            return { ...x, ...catalog, pendiente }
        })
        this.replace({
            ...p,
            productos: normalized,
            etapa: normalized.length
                ? p.etapa === 'Análisis'
                    ? 'Promoción'
                    : p.etapa
                : 'Análisis',
        })
        this.notice.set(
            normalized.some((x) => x.pendiente)
                ? 'Productos guardados. Hay precios pendientes de autorización.'
                : 'Productos guardados correctamente.',
        )
    }
    updateVpo(id: number, value: number) {
        const p = this.get(id)
        if (!esEditable(p) || !positive(value))
            throw new Error('El VPO debe ser mayor que cero y el proyecto debe estar activo.')
        this.replace({ ...p, vpo: value })
        this.notice.set('VPO actualizado.')
    }
    transition(id: number, to: Etapa, reason = '') {
        const p = this.get(id)
        if (!esEditable(p))
            throw new Error(
                'El proyecto está finalizado o tiene precios pendientes de autorización.',
            )
        if (to === 'Cancelada') {
            if (!reason.trim()) throw new Error('Indica el motivo de cancelación.')
            this.replace({ ...p, etapa: to, motivoCancelacion: reason })
        } else if (to === 'Negociación' && p.etapa === 'Promoción') {
            this.replace({ ...p, etapa: to })
        } else if (
            to === 'Cierre' &&
            (p.etapa === 'Promoción' || p.etapa === 'Negociación') &&
            p.productos.length
        ) {
            this.replace({ ...p, etapa: to, acys: montoProyecto(p) })
        } else throw new Error('El cambio de etapa no está disponible.')
        this.notice.set(
            to === 'Cierre'
                ? 'Proyecto cerrado. ACyS generado en la demostración.'
                : to === 'Cancelada'
                  ? 'Proyecto cancelado.'
                  : 'Proyecto en negociación.',
        )
    }
    approvePrices(id: number) {
        const p = this.get(id)
        if (!tienePendientes(p)) return
        this.replace({ ...p, productos: p.productos.map((x) => ({ ...x, pendiente: false })) })
        this.notice.set('Autorización de precios simulada correctamente.')
    }
}
