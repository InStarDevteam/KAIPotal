function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  const needsQuote = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function downloadCsv(
  filename: string,
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[],
): void {
  const headerLine = headers.map(h => escapeCsvCell(h.label)).join(',');
  const lines = rows.map(row =>
    headers.map(h => escapeCsvCell(row[h.key])).join(','),
  );
  const bom = '\uFEFF';
  const csvContent = `${bom}${headerLine}\n${lines.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
