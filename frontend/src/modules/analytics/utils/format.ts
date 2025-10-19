// Форматирование чисел и процентов для аналитики

export const formatPercentage = (value: number | null | undefined, fractionDigits = 1): string => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  const percent = value * 100;
  return `${percent.toFixed(fractionDigits)}%`;
};

export const formatScore = (value: number | null | undefined, fractionDigits = 2): string => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(fractionDigits);
};

export const formatInteger = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
};
