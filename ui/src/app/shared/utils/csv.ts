export function downloadCsv(filename: string, rows: unknown[][]) {
    const quote = (value: unknown) =>
        '"' +
        String(value ?? '')
            .replace(/^[=+@-]/, "'$&")
            .replaceAll('"', '""') +
        '"'
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
