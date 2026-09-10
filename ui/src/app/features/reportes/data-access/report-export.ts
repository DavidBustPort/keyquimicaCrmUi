import { ExportMode, ReportRow } from '@features/reportes/models/reporte'
import { CATALOGS, label } from './reportes-mock'
const escapeXml = (value: string | number) =>
    String(value).replace(
        /[<>&"']/g,
        (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
    )
export function buildReportWorkbook(rows: ReportRow[], mode: ExportMode): string {
    const sheets: { name: string; rows: (string | number)[][] }[] = []
    if (mode !== 'database')
        sheets.push({
            name: 'Resumen KPIs',
            rows: [
                ['Etapa', 'Oportunidades', 'VPO al cierre (MXN)'],
                ...CATALOGS.stage.map((s) => {
                    const matches = rows.filter((r) => r.stage === s.value)
                    return [s.label, matches.length, matches.reduce((sum, r) => sum + r.amount, 0)]
                }),
                ['Total', rows.length, rows.reduce((sum, r) => sum + r.amount, 0)],
            ],
        })
    if (mode !== 'kpi')
        sheets.push({
            name: 'Base de datos',
            rows: [
                [
                    'Oportunidad',
                    'Periodo',
                    'Sucursal',
                    'Representante',
                    'Cliente',
                    'Tipo de cliente',
                    'Etapa',
                    'Categoría',
                    'UEN',
                    'Segmento',
                    'Tipo de venta',
                    'Proveedor',
                    'VPO al cierre (MXN)',
                ],
                ...rows.map((r) => [
                    r.id,
                    r.month,
                    label('branch', r.branch),
                    label('representative', r.representative),
                    r.client,
                    label('clientType', r.clientType),
                    label('stage', r.stage),
                    label('category', r.category),
                    label('uen', r.uen),
                    label('segment', r.segment),
                    label('saleType', r.saleType),
                    label('supplier', r.supplier),
                    r.amount,
                ]),
            ],
        })
    return (
        '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
        sheets
            .map(
                (s) =>
                    '<Worksheet ss:Name="' +
                    escapeXml(s.name) +
                    '"><Table>' +
                    s.rows
                        .map(
                            (row) =>
                                '<Row>' +
                                row
                                    .map(
                                        (cell) =>
                                            '<Cell><Data ss:Type="' +
                                            (typeof cell === 'number' ? 'Number' : 'String') +
                                            '">' +
                                            escapeXml(cell) +
                                            '</Data></Cell>',
                                    )
                                    .join('') +
                                '</Row>',
                        )
                        .join('') +
                    '</Table></Worksheet>',
            )
            .join('') +
        '</Workbook>'
    )
}
export function downloadReport(rows: ReportRow[], mode: ExportMode, start: string, end: string) {
    const url = URL.createObjectURL(
        new Blob([buildReportWorkbook(rows, mode)], { type: 'application/xml;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'gestion-oportunidades-' + start + '-' + end + '-' + mode + '.xml'
    document.body.appendChild(a)
    try {
        a.click()
    } finally {
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}
