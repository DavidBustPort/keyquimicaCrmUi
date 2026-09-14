import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { map } from 'rxjs'
import { environment } from '@env/environment'
import { ApiResponse } from '@app/models/api-response.model'
import { AltaProyecto, Catalogo, ClienteBusqueda, EdicionResponse, Embudo, EmbudoQuery, PrecioSolicitud, Producto, ProductoBusqueda, ProductoRequest, Proyecto } from '../models/oportunidad'
@Injectable({ providedIn: 'root' })
export class OportunidadesApiService {
	private readonly http = inject(HttpClient)
	private readonly url = environment.apiUrl + '/crm/oportunidades'
	private params(query: object) {
		let p = new HttpParams()
		for (const [k, v] of Object.entries(query)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v))
		return p
	}
	private unwrap<T>(r: ApiResponse<T>): T {
		if (!r.succeeded || r.data === null || r.data === undefined) throw new Error(r.errors?.join(' ') || r.message || 'No se pudo completar la solicitud.')
		return r.data
	}
	private get<T>(path: string, query: object = {}) {
		return this.http.get<ApiResponse<T>>(this.url + path, { params: this.params(query) }).pipe(map((r) => this.unwrap(r)))
	}
	private write<T>(method: string, path: string, body: unknown) {
		return this.http.request<ApiResponse<T>>(method, this.url + path, { body }).pipe(map((r) => this.unwrap(r)))
	}
	embudo(query: EmbudoQuery) {
		return this.get<{ totalRows: number; oportunidades: Embudo[] }>('/embudo', query)
	}
	proyectos(clienteId: number, page: number, itemsPerPage: number) {
		return this.get<{ totalRows: number; proyectos: Proyecto[] }>('', { clienteId, page, itemsPerPage })
	}
	clientes(filter: string) {
		return this.get<ClienteBusqueda[]>('/clientes', { filter })
	}
	productos(filter: string, idSeg: number, idProducto?: number) {
		return this.get<ProductoBusqueda[]>('/productos', { filter, idSeg, idProducto })
	}
	catalogo(kind: string, parentId = 0, clienteId = 0) {
		return this.get<Catalogo[]>('/catalogos/' + kind, { parentId, clienteId })
	}
	dimension(clienteId: number, dimension: number) {
		return this.write<boolean>('PUT', '/dimension', { clienteId, dimension })
	}
	add(body: AltaProyecto) {
		return this.write<{ idOportunidad: number; idAplicacion: number }[]>('POST', '', body)
	}
	save(idOportunidad: number, productos: ProductoRequest[]) {
		return this.write<EdicionResponse>('PUT', '', { proyectos: [{ idOportunidad, productos }] })
	}
	requestPrices(idOportunidad: number, productos: PrecioSolicitud[]) {
		return this.write<boolean>('POST', '/solicitar-precios', { proyectos: [{ idOportunidad, productos }] })
	}
	vpo(idOportunidad: number, vpo: number) {
		return this.write<boolean>('PUT', '/actualizar-vpo', { idOportunidad, vpo })
	}
	cancel(idOportunidad: number, idCausa: number) {
		return this.write<boolean>('DELETE', '', { idOportunidad, idCausa })
	}
	negotiate(idOportunidad: number) {
		return this.write<boolean>('POST', '/etapa-negociacion', { idOportunidad })
	}
	close(idOportunidad: number) {
		return this.write<boolean>('POST', '/cerrar-oportunidad', { idOportunidad })
	}
	export(query: EmbudoQuery) {
		const { page, itemsPerPage, ...filters } = query
		return this.http.get(this.url + '/excel', { params: this.params(filters), responseType: 'blob' })
	}
	template() {
		return this.http.get(this.url + '/plantilla-productos', { params: { version: '2' }, responseType: 'blob' })
	}
	importProducts(file: File, idSeg: number) {
		const body = new FormData()
		body.append('file', file)
		body.append('idSeg', String(idSeg))
		return this.write<{ products: Producto[]; notFoundSkus: number[] }>('POST', '/importar-productos', body)
	}
}
