// Минимальные утилиты для работы с периодами аналитики на клиенте

export const startOfDayUtc = (input: Date): Date => {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

export const addMonthsUtc = (input: Date, months: number): Date => {
  const year = input.getUTCFullYear();
  const month = input.getUTCMonth();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(input.getUTCDate(), new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate());
  return new Date(Date.UTC(targetYear, normalizedMonth, day));
};
