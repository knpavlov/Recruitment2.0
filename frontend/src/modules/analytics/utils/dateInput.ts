// Вспомогательные функции для работы с вводом дат в аналитике

/**
 * Проверяем, что значение похоже на завершённую дату формата YYYY-MM-DD.
 */
export const isCompleteIsoDate = (value: string): boolean => {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
};
