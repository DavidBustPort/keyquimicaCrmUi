import { Component, computed, effect, ElementRef, inject, input, output, signal } from '@angular/core'
@Component({
	selector: 'app-month-calendar',
	host: {
		'(document:click)': 'closeOnOutsideClick($event)',
		'(keydown.escape)': 'open.set(false)'
	},
	template: ` <span class="label">{{ label() }}</span>
		<button
			type="button"
			class="trigger"
			[attr.aria-expanded]="open()"
			[attr.aria-label]="label() + ': ' + display()"
			(click)="open.set(!open())"
		>
			<span aria-hidden="true">▦</span> {{ display() }} <span aria-hidden="true">⌄</span>
		</button>
		@if (open()) {
			<div
				class="picker"
				(keydown.escape)="open.set(false)"
				role="group"
				[attr.aria-label]="label() + ': seleccionar mes'"
			>
				<div class="year">
					<button
						type="button"
						aria-label="Año anterior"
						[disabled]="year() <= 1000"
						(click)="year.set(year() - 1)"
					>
						‹</button
					><strong aria-live="polite">{{ year() }}</strong
					><button
						type="button"
						aria-label="Año siguiente"
						[disabled]="year() >= 9999"
						(click)="year.set(year() + 1)"
					>
						›
					</button>
				</div>
				<div class="months">
					@for (month of months; track month; let i = $index) {
						<button
							type="button"
							[class.selected]="value() === monthValue(i)"
							[attr.aria-pressed]="value() === monthValue(i)"
							[disabled]="disabled(i)"
							(click)="select(i)"
						>
							{{ month }}
						</button>
					}
				</div>
				<button
					type="button"
					class="close"
					(click)="open.set(false)"
				>
					Cerrar calendario
				</button>
			</div>
		}`,
	styles: [
		`
			:host {
				display: block;
				min-width: 0;
				position: relative;
			}
			.label {
				display: block;
				font-size: 0.875rem;
				line-height: 1.25rem;
				font-weight: 400;
				margin-bottom: 0.5rem;
			}
			.trigger {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
				width: 100%;
				box-sizing: border-box;
				height: 44px;
				min-height: 44px;
				padding: 10px 12px;
				border: 1px solid #dce3eb;
				border-radius: 7px;
				background: #f8fbff;
				color: #164c7e;
				font: inherit;
				font-size: 13px;
				text-transform: capitalize;
				cursor: pointer;
			}
			.picker {
				position: absolute;
				top: calc(100% + 8px);
				inset-inline: 0;
				z-index: 50;
				padding: 14px;
				border: 1px solid #dce8f5;
				border-radius: 14px;
				background: linear-gradient(145deg, #fff, #f5f9ff);
				box-shadow: 0 8px 24px #174b7e0c;
			}
			.year {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 12px;
				color: #164c7e;
			}
			.year button {
				font-size: 24px;
				width: 34px;
				height: 34px;
			}
			.months {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 7px;
			}
			button {
				border: 0;
				border-radius: 8px;
				background: transparent;
				color: inherit;
				cursor: pointer;
			}
			.months button {
				padding: 10px 4px;
				font: inherit;
				font-size: 12px;
			}
			.months button:hover:not(:disabled) {
				background: #e2effe;
			}
			.months button.selected {
				background: #007fc7;
				color: white;
				box-shadow: 0 3px 8px #007fc730;
			}
			button:disabled {
				opacity: 0.3;
				cursor: default;
			}
			button:focus-visible {
				outline: 2px solid #007fc7;
				outline-offset: 3px;
			}
			.close {
				display: block;
				margin: 12px auto 0;
				font-size: 11px;
				color: #526b84;
				padding: 5px;
			}
		`
	]
})
export class MonthCalendar {
	private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
	readonly label = input.required<string>()
	readonly value = input.required<string>()
	readonly min = input('')
	readonly max = input('')
	readonly valueChange = output<string>()
	readonly open = signal(false)
	readonly year = signal(new Date().getFullYear())
	readonly months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
	readonly display = computed(() => {
		const [y, m] = this.value().split('-').map(Number)
		return y && m ? new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1)) : 'Seleccionar mes'
	})
	constructor() {
		effect(() => {
			const y = Number(this.value().slice(0, 4))
			if (y) this.year.set(y)
		})
	}
	closeOnOutsideClick(event: MouseEvent) {
		if (this.open() && !event.composedPath().includes(this.element.nativeElement)) {
			this.open.set(false)
		}
	}
	monthValue(i: number) {
		return `${this.year()}-${String(i + 1).padStart(2, '0')}`
	}
	disabled(i: number) {
		const value = this.monthValue(i)
		return !!((this.min() && value < this.min()) || (this.max() && value > this.max()))
	}
	select(i: number) {
		if (this.disabled(i)) return
		this.valueChange.emit(this.monthValue(i))
		this.open.set(false)
	}
}
