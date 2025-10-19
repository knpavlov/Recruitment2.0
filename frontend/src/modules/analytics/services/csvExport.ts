export interface CsvColumn {
  key: string;
  title: string;
  format?: (value: unknown) => string;
}

export interface CsvRow {
  [key: string]: unknown;
}

const escapeValue = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

export const convertToCsv = (columns: CsvColumn[], rows: CsvRow[]): string => {
  const header = columns.map((column) => escapeValue(column.title)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const raw = row[column.key];
        const formatted = column.format ? column.format(raw) : normalizeValue(raw);
        return escapeValue(formatted);
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
};

export const downloadCsv = (fileName: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportCsv = (fileName: string, columns: CsvColumn[], rows: CsvRow[]) => {
  const csv = convertToCsv(columns, rows);
  downloadCsv(fileName, csv);
};
