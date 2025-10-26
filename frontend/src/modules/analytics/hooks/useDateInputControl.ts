import { useCallback, useEffect, useState } from 'react';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Контролируем ввод даты, применяя фильтрацию до тех пор, пока значение не будет полным.
 */
export const useDateInputControl = (
  committedValue: string | undefined,
  fallbackValue: string,
  onCommit: (value: string | undefined) => void
): { draft: string; handleChange: (next: string) => void } => {
  const [draft, setDraft] = useState<string>(committedValue ?? fallbackValue ?? '');

  useEffect(() => {
    const normalizedFallback = fallbackValue ?? '';
    const next = committedValue ?? normalizedFallback;
    setDraft((current) => (current === next ? current : next));
  }, [committedValue, fallbackValue]);

  const handleChange = useCallback(
    (next: string) => {
      setDraft(next);
      if (!next) {
        onCommit(undefined);
        return;
      }
      if (DATE_PATTERN.test(next)) {
        onCommit(next);
      }
    },
    [onCommit]
  );

  return { draft, handleChange };
};
