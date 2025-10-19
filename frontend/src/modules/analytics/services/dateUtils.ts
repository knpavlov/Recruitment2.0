const MS_IN_DAY = 24 * 60 * 60 * 1000;

const FEMALE_MARKERS = ['f', 'female', 'woman', 'жен', 'женский', 'женщина'];

export type FiscalYearStartMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const FISCAL_YEAR_START_MONTH: FiscalYearStartMonth = 1;

export const normalizeDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export const isFemaleGender = (gender?: string | null): boolean => {
  if (!gender) {
    return false;
  }
  const normalized = gender.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (FEMALE_MARKERS.includes(normalized)) {
    return true;
  }
  if (normalized.startsWith('f')) {
    return true;
  }
  if (normalized.startsWith('ж')) {
    return true;
  }
  return false;
};

export const startOfWeek = (value: Date): Date => {
  const date = new Date(value.getTime());
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day) * MS_IN_DAY;
  date.setUTCHours(0, 0, 0, 0);
  date.setTime(date.getTime() + diff);
  return date;
};

export const startOfMonth = (value: Date): Date => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  return date;
};

export const startOfQuarter = (value: Date): Date => {
  const quarter = Math.floor(value.getUTCMonth() / 3);
  return new Date(Date.UTC(value.getUTCFullYear(), quarter * 3, 1));
};

export const getFiscalYearStart = (reference: Date): Date => {
  const monthIndex = FISCAL_YEAR_START_MONTH - 1;
  const yearAdjustment = reference.getUTCMonth() + 1 < FISCAL_YEAR_START_MONTH ? -1 : 0;
  return new Date(Date.UTC(reference.getUTCFullYear() + yearAdjustment, monthIndex, 1));
};

export const formatWeekLabel = (start: Date): string => {
  const end = new Date(start.getTime() + 6 * MS_IN_DAY);
  return `${formatDayMonth(start)} — ${formatDayMonth(end)}`;
};

export const formatMonthLabel = (start: Date): string => {
  const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
  return monthFormatter.format(start);
};

export const formatQuarterLabel = (start: Date): string => {
  const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
  return `${quarter} кв. ${start.getUTCFullYear()}`;
};

export const formatDayMonth = (value: Date): string => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
  return formatter.format(value);
};

export const roundToOneDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

export const clampToPercent = (value: number): number => {
  return Math.max(0, Math.min(100, value));
};
