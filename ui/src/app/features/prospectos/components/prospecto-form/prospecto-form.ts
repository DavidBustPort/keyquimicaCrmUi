import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { CurrencyPipe } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { AuthStore } from '@core/auth/auth.store'
import { UserRole } from '@core/auth/auth.model'
import { ProspectosApiService } from '@features/prospectos/data-access/prospectos-api.service'
import { ProspectosNotice } from '@features/prospectos/data-access/prospectos.service'
import { CatalogOption, ProspectoDetail, ProspectoPayload } from '@features/prospectos/models/prospecto'
import { Lead } from '@features/leads/models/lead'
import { FormField } from '@shared/ui/form-field/form-field'
import { Modal } from '@shared/ui/modal/modal'
import { LeadsPicker } from '@features/prospectos/components/leads-picker/leads-picker'
const requiredText = Validators.pattern(/\S/)
@Component({ selector: 'app-prospecto-form', imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, FormField, Modal, LeadsPicker], templateUrl: './prospecto-form.html' })
export class ProspectoForm {
	readonly prospectoId = input<number>()
	readonly leadId = input<number>()
	readonly auth = inject(AuthStore)
	private readonly api = inject(ProspectosApiService)
	private readonly notice = inject(ProspectosNotice)
	private readonly router = inject(Router)
	private readonly fb = inject(FormBuilder).nonNullable
	readonly canEdit = computed(() => this.auth.isFullyAuthenticated() && !this.auth.isCentral() && this.auth.session().role === UserRole.Rik)
	readonly selectedLead = signal<Lead | null>(null)
	readonly record = signal<ProspectoDetail | null>(null)
	readonly modalOpen = signal(false)
	readonly uens = signal<CatalogOption[]>([])
	readonly segments = signal<CatalogOption[]>([])
	readonly loading = signal(false)
	readonly segmentLoading = signal(false)
	readonly saving = signal(false)
	readonly error = signal('')
	readonly ready = signal(false)
	readonly submitted = signal(false)
	readonly requiresContact = computed(() => !!this.selectedLead() || !!this.record()?.idLead)
	private generation = 0
	private segmentGeneration = 0
	readonly form = this.fb.group({
		razonSocial: ['', [Validators.required, requiredText, Validators.maxLength(180)]],
		contacto: ['', Validators.maxLength(120)],
		correo: ['', [Validators.email, Validators.maxLength(180)]],
		telefono: ['', Validators.maxLength(30)],
		uenId: [0, [Validators.required, Validators.min(1)]],
		segmentoId: [0, [Validators.required, Validators.min(1)]],
		tipoClienteId: [0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
		territorioId: [0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
		vpo: [0, [Validators.required, Validators.min(0.01)]],
		observaciones: ['', Validators.maxLength(2000)]
	})
	constructor() {
		effect(() => {
			const id = this.prospectoId(),
				allowed = this.canEdit()
			this.auth.session()
			untracked(() => {
				this.generation++
				this.segmentGeneration++
				this.record.set(null)
				this.selectedLead.set(null)
				this.modalOpen.set(false)
				this.ready.set(false)
				this.uens.set([])
				this.segments.set([])
				this.form.reset()
				this.loading.set(false)
				this.error.set('')
				if (allowed) void this.load(id)
			})
		})
		effect(() => {
			const required = this.requiresContact()
			for (const name of ['contacto', 'correo', 'telefono', 'observaciones'] as const) {
				const c = this.form.controls[name]
				required ? c.addValidators([Validators.required, requiredText]) : c.removeValidators([Validators.required, requiredText])
				c.updateValueAndValidity()
			}
		})
	}
	async load(id = this.prospectoId()) {
		const generation = ++this.generation
		this.loading.set(true)
		this.ready.set(false)
		this.error.set('')
		try {
			if (id !== undefined && (!Number.isInteger(id) || id < 1)) throw new Error('El ID de prospecto no es válido.')
			const uens = await firstValueFrom(this.api.uens())
			if (generation !== this.generation) return
			this.uens.set(uens)
			if (id !== undefined) {
				const p = await firstValueFrom(this.api.detail(id))
				if (generation !== this.generation) return
				this.record.set(p)
				this.form.patchValue({
					razonSocial: p.razonSocial,
					contacto: p.contacto ?? '',
					correo: p.correo ?? '',
					telefono: p.telefono ?? '',
					uenId: p.uenId ?? 0,
					segmentoId: p.segmentoId ?? 0,
					tipoClienteId: p.tipoClienteId,
					territorioId: p.territorioId ?? 0,
					vpo: p.vpo ?? 0,
					observaciones: p.observaciones ?? ''
				})
				if (p.uenId) {
					const segments = await firstValueFrom(this.api.segments(p.uenId))
					if (generation !== this.generation) return
					this.segments.set(segments)
				}
			}
			this.ready.set(true)
			if (id === undefined && this.leadId() !== undefined) this.modalOpen.set(true)
		} catch (e) {
			if (generation === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el formulario.')
		} finally {
			if (generation === this.generation) this.loading.set(false)
		}
	}
	async changeUen() {
		const generation = ++this.segmentGeneration,
			scope = this.generation
		this.form.controls.segmentoId.setValue(0)
		this.segments.set([])
		this.segmentLoading.set(false)
		this.error.set('')
		const id = this.form.controls.uenId.value
		if (!id) return
		this.segmentLoading.set(true)
		try {
			const rows = await firstValueFrom(this.api.segments(id))
			if (generation === this.segmentGeneration && scope === this.generation) this.segments.set(rows)
		} catch {
			if (generation === this.segmentGeneration && scope === this.generation) this.error.set('No se pudieron cargar los segmentos. Reintenta seleccionando la UEN.')
		} finally {
			if (generation === this.segmentGeneration && scope === this.generation) this.segmentLoading.set(false)
		}
	}
	fieldError(name: keyof typeof this.form.controls) {
		const c = this.form.controls[name]
		if (!c.invalid || (!c.touched && !this.submitted())) return ''
		if (c.hasError('email')) return 'Ingresa un correo válido.'
		if (c.hasError('maxlength')) return 'El texto supera la longitud máxima.'
		return 'Completa este campo con un valor válido.'
	}
	selectLead(lead: Lead) {
		if (!this.canEdit() || this.prospectoId() !== undefined) return
		this.selectedLead.set(lead)
		this.form.patchValue({ razonSocial: lead.empresa, contacto: lead.contacto, correo: lead.correo, telefono: lead.telefono })
		this.modalOpen.set(false)
	}
	removeLead() {
		this.selectedLead.set(null)
		this.form.patchValue({ razonSocial: '', contacto: '', correo: '', telefono: '' })
	}
	async save() {
		if (!this.canEdit() || this.saving() || !this.ready()) return
		this.submitted.set(true)
		this.error.set('')
		if (this.form.invalid) {
			this.form.markAllAsTouched()
			return
		}
		const f = this.form.getRawValue()
		if (!this.uens().some((u) => u.id === f.uenId) || !this.segments().some((s) => s.id === f.segmentoId)) {
			this.error.set('Selecciona una UEN y un segmento válidos.')
			return
		}
		if (this.requiresContact() && [f.contacto, f.correo, f.telefono, f.observaciones].some((v) => !v.trim())) {
			this.error.set('Completa contacto, correo, teléfono y observaciones para el lead.')
			return
		}
		const payload: ProspectoPayload = { ...f, razonSocial: f.razonSocial.trim(), contacto: f.contacto.trim() || null, correo: f.correo.trim() || null, telefono: f.telefono.trim() || null, observaciones: f.observaciones.trim() || null }
		const generation = this.generation
		this.saving.set(true)
		try {
			const message = await firstValueFrom(this.api.save(payload, this.prospectoId(), this.selectedLead()?.id))
			if (generation !== this.generation) return
			this.notice.message.set(message)
			await this.router.navigateByUrl('/prospectos')
		} catch (e) {
			if (generation === this.generation) this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el prospecto.')
		} finally {
			this.saving.set(false)
		}
	}
}
