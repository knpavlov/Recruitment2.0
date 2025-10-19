export type ExportRow = Record<string, string | number | null>;

const formatValue = (value: string | number | null) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  const escaped = value.replace(/"/g, '""');
  return value.includes(';') || value.includes('"') || value.includes('\n') ? `"${escaped}"` : value;
};

export const exportToCsv = (filename: string, rows: ExportRow[]) => {
  if (!rows.length) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const data = [headers.join(';')];
  for (const row of rows) {
    data.push(headers.map((header) => formatValue(row[header] ?? '')).join(';'));
  }
  const csvContent = `\ufeff${data.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(link.href);
};
