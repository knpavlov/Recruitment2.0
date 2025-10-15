import { useEffect, useMemo, useState } from 'react';
import { CaseCriterion } from '../../../shared/types/caseCriteria';
import styles from '../../../styles/CaseCriterionEditorCard.module.css';

interface CaseCriterionEditorCardProps {
  criterion: CaseCriterion;
  mode: 'existing' | 'new';
  onSave: (
    criterion: CaseCriterion,
    meta: { expectedVersion: number | null }
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancelNew?: (id: string) => void;
  onInteraction?: () => void;
}

const sanitizeCriterion = (draft: CaseCriterion): CaseCriterion => {
  const ratings: CaseCriterion['ratings'] = {};
  (['1', '2', '3', '4', '5'] as const).forEach((scoreKey) => {
    const score = Number(scoreKey) as 1 | 2 | 3 | 4 | 5;
    const value = draft.ratings[score];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        ratings[score] = trimmed;
      }
    }
  });
  return {
    ...draft,
    title: draft.title.trim(),
    ratings
  };
};

export const CaseCriterionEditorCard = ({
  criterion,
  mode,
  onSave,
  onDelete,
  onCancelNew,
  onInteraction
}: CaseCriterionEditorCardProps) => {
  const [draft, setDraft] = useState<CaseCriterion>(criterion);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Сбрасываем локальное состояние, если пришла новая версия критерия
    setDraft(criterion);
  }, [criterion]);

  const hasChanges = useMemo(() => {
    const sanitized = sanitizeCriterion(draft);
    const original = sanitizeCriterion(criterion);
    return JSON.stringify(sanitized) !== JSON.stringify(original);
  }, [draft, criterion]);

  const handleTitleChange = (value: string) => {
    onInteraction?.();
    setDraft((prev) => ({ ...prev, title: value }));
  };

  const handleRatingChange = (score: 1 | 2 | 3 | 4 | 5, value: string) => {
    onInteraction?.();
    setDraft((prev) => ({
      ...prev,
      ratings: { ...prev.ratings, [score]: value }
    }));
  };

  const handleSave = async () => {
    const normalized = sanitizeCriterion(draft);
    if (!normalized.title) {
      return;
    }
    setSaving(true);
    try {
      await onSave(normalized, {
        expectedVersion: mode === 'existing' ? criterion.version : null
      });
      setDraft(normalized);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }
    setSaving(true);
    try {
      await onDelete(criterion.id);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNew = () => {
    onCancelNew?.(criterion.id);
  };

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h3>{mode === 'existing' ? 'Case criterion' : 'New case criterion'}</h3>
        <div className={styles.headerActions}>
          {mode === 'existing' ? (
            <button
              className={styles.dangerButton}
              onClick={() => void handleDelete()}
              disabled={saving}
              type="button"
            >
              Delete
            </button>
          ) : (
            <button
              className={styles.secondaryButton}
              onClick={handleCancelNew}
              disabled={saving}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      <label className={styles.fieldGroup}>
        <span>Criterion title</span>
        <input
          type="text"
          value={draft.title}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="Enter criterion title"
        />
      </label>

      <div className={styles.ratingsGrid}>
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className={styles.ratingBlock}>
            <span className={styles.ratingLabel}>Score {score}</span>
            <textarea
              value={draft.ratings[score as 1 | 2 | 3 | 4 | 5] ?? ''}
              onChange={(event) => handleRatingChange(score as 1 | 2 | 3 | 4 | 5, event.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </label>
        ))}
      </div>

      <footer className={styles.footer}>
        <button
          className={styles.primaryButton}
          onClick={() => void handleSave()}
          disabled={saving || !draft.title.trim() || !hasChanges}
          type="button"
        >
          Save changes
        </button>
        {mode === 'existing' && hasChanges && (
          <button
            className={styles.secondaryButton}
            onClick={() => {
              onInteraction?.();
              setDraft(criterion);
            }}
            disabled={saving}
            type="button"
          >
            Reset
          </button>
        )}
      </footer>
    </div>
  );
};
