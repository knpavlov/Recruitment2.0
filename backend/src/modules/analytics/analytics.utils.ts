// Вспомогательные функции для расчётов в аналитике. Все даты считаем в UTC.

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export const startOfDayUtc = (input: Date): Date => {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

export const addDaysUtc = (input: Date, days: number): Date => {
  return new Date(input.getTime() + days * MS_IN_DAY);
};

export const startOfMonthUtc = (input: Date): Date => {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), 1));
};

export const addMonthsUtc = (input: Date, months: number): Date => {
  const year = input.getUTCFullYear();
  const month = input.getUTCMonth();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(input.getUTCDate(), daysInMonth(targetYear, normalizedMonth));
  return new Date(Date.UTC(targetYear, normalizedMonth, day));
};

const daysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

export const startOfQuarterUtc = (input: Date): Date => {
  const month = input.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(Date.UTC(input.getUTCFullYear(), quarterStartMonth, 1));
};

export const startOfWeekUtc = (input: Date): Date => {
  const day = input.getUTCDay();
  const diff = (day + 6) % 7; // Неделя начинается с понедельника
  return startOfDayUtc(addDaysUtc(input, -diff));
};

export const clampDateToRange = (value: Date, start: Date, end: Date): Date => {
  if (value < start) {
    return start;
  }
  if (value > end) {
    return end;
  }
  return value;
};

export const getFiscalYearStartUtc = (reference: Date, startMonth: number): Date => {
  const normalizedMonth = Math.min(Math.max(startMonth, 1), 12) - 1;
  const refYear = reference.getUTCFullYear();
  const refMonth = reference.getUTCMonth();
  let year = refYear;
  if (refMonth < normalizedMonth) {
    year -= 1;
  }
  return new Date(Date.UTC(year, normalizedMonth, 1));
};

export const iteratePeriods = (
  start: Date,
  end: Date,
  granularity: 'week' | 'month' | 'quarter'
): { start: Date; end: Date }[] => {
  const periods: { start: Date; end: Date }[] = [];
  let cursor = new Date(start.getTime());
  while (cursor <= end) {
    let periodStart: Date;
    let periodEnd: Date;
    if (granularity === 'week') {
      periodStart = startOfWeekUtc(cursor);
      periodEnd = addDaysUtc(addDaysUtc(periodStart, 7), -1);
    } else if (granularity === 'month') {
      periodStart = startOfMonthUtc(cursor);
      periodEnd = addDaysUtc(addMonthsUtc(periodStart, 1), -1);
    } else {
      periodStart = startOfQuarterUtc(cursor);
      periodEnd = addDaysUtc(addMonthsUtc(periodStart, 3), -1);
    }
    if (periodEnd < start) {
      cursor = addDaysUtc(periodEnd, 1);
      continue;
    }
    if (periodStart > end) {
      break;
    }
    const adjustedStart = periodStart < start ? start : periodStart;
    const adjustedEnd = periodEnd > end ? end : periodEnd;
    periods.push({ start: adjustedStart, end: adjustedEnd });
    cursor = addDaysUtc(periodEnd, 1);
  }
  return periods;
};

export const isDateInRange = (value: Date, start: Date, end: Date): boolean => {
  return value >= start && value <= end;
};

export const parseIsoDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) {
    return new Date(fallback.getTime());
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback.getTime());
  }
  return parsed;
};
