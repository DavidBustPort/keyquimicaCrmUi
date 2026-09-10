import { ReportFilters, ReportRow } from '@features/reportes/models/reporte'
export const GROUPS = [
    { value: '1', label: 'CDI PROPIOS' },
    { value: '2', label: 'CDC PROPIOS' },
    { value: '3', label: 'CDI FRANQUICIAS' },
    { value: '4', label: 'CDC FRANQUICIAS' },
]
export const BRANCHES = [
    { value: '1', label: 'Chihuahua Norte', group: '1' },
    { value: '2', label: 'Chihuahua Sur', group: '1' },
    { value: '3', label: 'Ciudad Juárez', group: '2' },
    { value: '4', label: 'Delicias', group: '3' },
    { value: '5', label: 'Cuauhtémoc', group: '4' },
]
export const REPS = [
    { value: '1', label: 'Ana Torres', branch: '1' },
    { value: '2', label: 'Luis Mendoza', branch: '1' },
    { value: '3', label: 'María García', branch: '2' },
    { value: '4', label: 'Carlos Molina', branch: '3' },
    { value: '5', label: 'Sofía Reyes', branch: '4' },
    { value: '6', label: 'Laura Méndez', branch: '5' },
]
export const CATALOGS = {
    clientType: [
        { value: 'TD', label: 'Cliente TD (Tradicional)' },
        { value: 'LD', label: 'Cliente LD (Leads)' },
    ],
    stage: [
        { value: '1', label: 'Análisis' },
        { value: '2', label: 'Promoción' },
        { value: '3', label: 'Negociación' },
        { value: '4', label: 'Cierre' },
        { value: '5', label: 'Cancelada' },
    ],
    category: [
        { value: '1', label: 'Químicos' },
        { value: '2', label: 'Equipos' },
        { value: '3', label: 'Accesorios' },
    ],
    uen: [
        { value: '1', label: 'Institucional' },
        { value: '2', label: 'Industrial' },
    ],
    saleType: [
        { value: 'VI', label: 'Venta Instalada' },
        { value: 'VE', label: 'Venta Esporádica' },
    ],
    supplier: [
        { value: '1', label: 'KEY' },
        { value: '2', label: 'Proveedor regional' },
    ],
}
export const SEGMENTS = [
    { value: '1', label: 'Hotelería', uen: '1' },
    { value: '2', label: 'Salud', uen: '1' },
    { value: '3', label: 'Alimentos', uen: '2' },
    { value: '4', label: 'Manufactura', uen: '2' },
]
export function month(offset = 0) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + offset)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
export function defaults(): ReportFilters {
    return {
        view: 'central',
        group: '1',
        branches: ['1', '2'],
        representative: '',
        start: month(),
        end: month(),
        clientType: '',
        stage: '',
        category: '',
        uen: '',
        segment: '',
        saleType: '',
        supplier: '',
        mode: 'all',
    }
}
export function validPeriod(f: ReportFilters) {
    return (
        [f.start, f.end].every(
            (v) => /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(v) && Number(v.slice(0, 4)) > 0,
        ) && f.start <= f.end
    )
}
export function mockRows(): ReportRow[] {
    return Array.from({ length: 12 }, (_, m) =>
        REPS.flatMap((r, i) =>
            Array.from({ length: 12 }, (_, n) => ({
                id: 10000 + m * 1000 + i * 100 + n,
                month: month(-m),
                branch: r.branch,
                representative: r.value,
                client: [
                    'Hotel Sierra Norte',
                    'Clínica del Valle',
                    'Alimentos Las Cumbres',
                    'Industrias del Norte',
                ][(n + i) % 4],
                clientType: n % 2 ? 'LD' : 'TD',
                stage: String((n % 5) + 1),
                category: String((n % 3) + 1),
                uen: n % 4 < 2 ? '1' : '2',
                segment: String((n % 4) + 1),
                saleType: n % 3 ? 'VI' : 'VE',
                supplier: n % 2 ? '1' : '2',
                amount: 12500 + n * 3250 + i * 2100 + m * 500,
            })),
        ),
    ).flat()
}
export function filterRows(rows: ReportRow[], f: ReportFilters) {
    if (!validPeriod(f)) return []
    const branches =
        f.view === 'central'
            ? f.branches.filter((id) => BRANCHES.some((b) => b.value === id && b.group === f.group))
            : ['1']
    const rep = f.view === 'representante' ? '1' : f.representative
    return rows.filter(
        (row) =>
            row.month >= f.start &&
            row.month <= f.end &&
            branches.includes(row.branch) &&
            (!rep || row.representative === rep) &&
            (
                [
                    'clientType',
                    'stage',
                    'category',
                    'uen',
                    'segment',
                    'saleType',
                    'supplier',
                ] as const
            ).every(
                (key) =>
                    (key === 'supplier' && f.view !== 'central') || !f[key] || row[key] === f[key],
            ),
    )
}
export function label(
    key: keyof typeof CATALOGS | 'segment' | 'branch' | 'representative',
    value: string,
) {
    const list =
        key === 'segment'
            ? SEGMENTS
            : key === 'branch'
              ? BRANCHES
              : key === 'representative'
                ? REPS
                : CATALOGS[key]
    return list.find((x) => x.value === value)?.label ?? value
}
