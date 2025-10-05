// Утилита генерации идентификаторов с учётом отсутствия crypto в некоторых окружениях
export const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};
