const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Проверяет, соответствует ли строка формату UUID (без учёта регистра и с учётом ведущих/замыкающих пробелов).
 */
export const isUuid = (value: string): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return UUID_PATTERN.test(value.trim());
};

