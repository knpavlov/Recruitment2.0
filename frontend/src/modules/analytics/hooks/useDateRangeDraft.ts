import { useCallback, useEffect, useMemo, useState } from 'react';

interface DateRangeDraftOptions {
  controlledFrom: string;
  controlledTo: string;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
}

interface DateRangeDraftState {
  fromDraft: string;
  toDraft: string;
  setFromDraft: (value: string) => void;
  setToDraft: (value: string) => void;
  hasChanges: boolean;
  isValid: boolean;
  canApply: boolean;
  applyDraft: () => boolean;
  resetDraft: () => void;
}

const isCompleteDate = (value: string): boolean => value.length === 10;

/**
 * Хук хранит локальные черновики значений фильтра по датам и отложенно синхронизирует их снаружи.
 * Это позволяет избежать лишних запросов, пока пользователь вводит год по символам.
 */
export const useDateRangeDraft = ({
  controlledFrom,
  controlledTo,
  onFromChange,
  onToChange
}: DateRangeDraftOptions): DateRangeDraftState => {
  const [fromDraft, setFromDraft] = useState(controlledFrom);
  const [toDraft, setToDraft] = useState(controlledTo);

  useEffect(() => {
    setFromDraft(controlledFrom);
  }, [controlledFrom]);

  useEffect(() => {
    setToDraft(controlledTo);
  }, [controlledTo]);

  const hasChanges = useMemo(
    () => fromDraft !== controlledFrom || toDraft !== controlledTo,
    [fromDraft, toDraft, controlledFrom, controlledTo]
  );

  const isValid = useMemo(() => {
    const fromValid = !fromDraft || isCompleteDate(fromDraft);
    const toValid = !toDraft || isCompleteDate(toDraft);
    return fromValid && toValid;
  }, [fromDraft, toDraft]);

  const applyDraft = useCallback(() => {
    if (!isValid) {
      return false;
    }
    onFromChange(fromDraft ? fromDraft : undefined);
    onToChange(toDraft ? toDraft : undefined);
    return true;
  }, [fromDraft, toDraft, isValid, onFromChange, onToChange]);

  const resetDraft = useCallback(() => {
    setFromDraft(controlledFrom);
    setToDraft(controlledTo);
  }, [controlledFrom, controlledTo]);

  const canApply = hasChanges && isValid;

  return {
    fromDraft,
    toDraft,
    setFromDraft,
    setToDraft,
    hasChanges,
    isValid,
    canApply,
    applyDraft,
    resetDraft
  };
};

