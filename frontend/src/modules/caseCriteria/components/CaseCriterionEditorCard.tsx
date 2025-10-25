import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isEditingTitle, setIsEditingTitle] = useState(mode === 'new' && !criterion.title);
  const [titleBeforeEdit, setTitleBeforeEdit] = useState(criterion.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Сбрасываем локальное состояние, если пришла новая версия критерия
    setDraft(criterion);
    setIsEditingTitle(mode === 'new' && !criterion.title);
    setTitleBeforeEdit(criterion.title);
  }, [criterion, mode]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

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

  const handleStartEditTitle = () => {
    onInteraction?.();
    setTitleBeforeEdit(draft.title);
    setIsEditingTitle(true);
  };

  const handleCancelEditTitle = () => {
    onInteraction?.();
    setDraft((prev) => ({ ...prev, title: titleBeforeEdit }));
    setIsEditingTitle(false);
  };

  const handleConfirmEditTitle = () => {
    setIsEditingTitle(false);
  };

  const displayTitle = draft.title.trim() ? draft.title : 'Untitled criterion';

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleColumn}>
          {isEditingTitle ? (
            <div className={styles.titleEditor}>
              <input
                ref={titleInputRef}
                className={styles.titleInput}
                type="text"
                value={draft.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Enter criterion title"
                aria-label="Criterion title"
              />
              <div className={styles.titleEditorActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handleConfirmEditTitle}
                  disabled={!draft.title.trim() || saving}
                >
                  Done
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={handleCancelEditTitle}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.titleDisplay}>
              <h3
                className={`${styles.titleText} ${
                  draft.title.trim() ? '' : styles.titlePlaceholder
                }`}
              >
                {displayTitle}
              </h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleStartEditTitle}
                disabled={saving}
                aria-label="Edit criterion title"
              >
                <PencilIcon />
              </button>
            </div>
          )}
        </div>
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

const PencilIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 15.5V20h4.5L19.29 9.21a1 1 0 0 0 0-1.42l-3.08-3.08a1 1 0 0 0-1.42 0L4 15.5Z"
      fill="currentColor"
    />
    <path d="M20 21H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
