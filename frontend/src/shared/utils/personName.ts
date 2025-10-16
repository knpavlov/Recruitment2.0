export interface FormatNameOptions {
  firstName?: string | null;
  lastName?: string | null;
  fallback: string;
}

export interface FormatNameResult {
  display: string;
  sortKey: string;
}

/**
 * Форматирует имя и фамилию так, чтобы можно было показать вариант «Имя Фамилия»,
 * но при этом сохранить отдельный ключ для сортировки по фамилии.
 */
export const formatFirstLastName = ({
  firstName,
  lastName,
  fallback
}: FormatNameOptions): FormatNameResult => {
  const trimmedFirst = firstName?.trim() ?? '';
  const trimmedLast = lastName?.trim() ?? '';
  const display = [trimmedFirst, trimmedLast].filter(Boolean).join(' ').trim();
  const sortKey = [trimmedLast, trimmedFirst].filter(Boolean).join(' ').trim();
  const safeDisplay = display || fallback;
  const safeSortKey = sortKey || display || fallback;
  return { display: safeDisplay, sortKey: safeSortKey };
};
