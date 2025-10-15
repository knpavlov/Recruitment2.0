import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/CaseCriteriaScreen.module.css';
import { CaseCriterion } from '../../shared/types/caseCriteria';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { generateId } from '../../shared/ui/generateId';

const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

type Banner = { type: 'info' | 'error'; text: string } | null;

type DraftCriterion = {
  id: string;
  title: string;
  ratings: Record<(typeof SCORE_VALUES)[number], string>;
};

const createDraftCriterion = (criterion?: CaseCriterion): DraftCriterion => {
  const ratings: DraftCriterion['ratings'] = { 1: '', 2: '', 3: '', 4: '', 5: '' };
  if (criterion) {
    for (const score of SCORE_VALUES) {
      ratings[score] = criterion.ratings[score]?.trim() ?? '';
    }
  }
  return {
    id: criterion?.id ?? generateId(),
    title: criterion?.title ?? '',
    ratings
  };
};

const normalizeDraft = (items: DraftCriterion[]): CaseCriterion[] =>
  items.map((item) => {
    const normalizedRatings: CaseCriterion['ratings'] = {};
    for (const score of SCORE_VALUES) {
      const value = item.ratings[score].trim();
      if (value) {
        normalizedRatings[score] = value;
      }
    }
    return {
      id: item.id,
      title: item.title.trim(),
      ratings: normalizedRatings
    };
  });

const areCriteriaListsEqual = (a: CaseCriterion[], b: CaseCriterion[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const first = a[index];
    const second = b[index];
    if (first.id !== second.id) {
      return false;
    }
    if (first.title.trim() !== second.title.trim()) {
      return false;
    }
    for (const score of SCORE_VALUES) {
      if ((first.ratings[score] ?? '') !== (second.ratings[score] ?? '')) {
        return false;
      }
    }
  }
  return true;
};

const CriterionEditor = ({
  value,
  onChange,
  onRemove,
  disableRemove
}: {
  value: DraftCriterion;
  onChange: (next: DraftCriterion) => void;
  onRemove: () => void;
  disableRemove: boolean;
}) => {
  return (
    <div className={styles.criterionCard}>
      <div className={styles.criterionHeader}>
        <div className={styles.criterionTitleBlock}>
          <label>
            <span className={styles.fieldLabel}>Criterion title</span>
            <input
              className={styles.textInput}
              value={value.title}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
              placeholder="e.g. Problem structuring"
            />
          </label>
        </div>
        <button
          className={styles.removeButton}
          type="button"
          onClick={onRemove}
          disabled={disableRemove}
        >
          Remove
        </button>
      </div>
      <div className={styles.ratingsGrid}>
        {SCORE_VALUES.map((score) => (
          <label key={score} className={styles.ratingBlock}>
            <span className={styles.fieldLabel}>Score {score}</span>
            <textarea
              className={styles.textArea}
              value={value.ratings[score]}
              onChange={(event) =>
                onChange({
                  ...value,
                  ratings: { ...value.ratings, [score]: event.target.value }
                })
              }
              placeholder={`What does score ${score} mean?`}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export const CaseCriteriaScreen = () => {
  const { items, version, saveAll } = useCaseCriteriaState();
  const [draft, setDraft] = useState<DraftCriterion[]>(items.map((item) => createDraftCriterion(item)));
  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(items.map((item) => createDraftCriterion(item)));
  }, [items]);

  const normalizedDraft = useMemo(() => normalizeDraft(draft), [draft]);
  const normalizedSource = useMemo(() => normalizeDraft(items.map((item) => createDraftCriterion(item))), [items]);

  const hasChanges = useMemo(
    () => !areCriteriaListsEqual(normalizedDraft, normalizedSource),
    [normalizedDraft, normalizedSource]
  );

  const isValid = draft.every((criterion) => criterion.title.trim().length > 0);

  const handleAddCriterion = () => {
    setDraft((prev) => [...prev, createDraftCriterion()]);
  };

  const handleSave = async () => {
    if (!isValid) {
      setBanner({ type: 'error', text: 'Provide a title for every criterion.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const result = await saveAll(normalizedDraft);
      if (!result.ok) {
        const message =
          result.error === 'version-conflict'
            ? 'The criteria were updated in another tab. Refresh the page and try again.'
            : result.error === 'invalid-input'
              ? 'Check the entered data and retry saving.'
              : 'Failed to save the criteria.';
        setBanner({ type: 'error', text: message });
        return;
      }
      setBanner({ type: 'info', text: 'Case criteria updated.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(items.map((item) => createDraftCriterion(item)));
    setBanner(null);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Case criteria</h1>
          <p className={styles.subtitle}>
            Configure the scoring rubric for case interviews. Interviewers will use these criteria in their forms.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <button className={styles.secondaryButton} type="button" onClick={handleReset} disabled={saving || !hasChanges}>
            Reset
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges || !isValid}
          >
            Save changes
          </button>
        </div>
      </header>

      <div className={styles.metaRow}>
        <span className={styles.versionBadge}>Version {version}</span>
        <button className={styles.linkButton} type="button" onClick={handleAddCriterion} disabled={saving}>
          + Add criterion
        </button>
      </div>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.criteriaList}>
        {draft.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No criteria yet</h2>
            <p>Use the “Add criterion” button to start building the case rubric.</p>
          </div>
        ) : (
          draft.map((criterion, index) => (
            <CriterionEditor
              key={criterion.id}
              value={criterion}
              onChange={(next) =>
                setDraft((prev) => prev.map((item) => (item.id === next.id ? next : item)))
              }
              onRemove={() =>
                setDraft((prev) => prev.filter((item) => item.id !== criterion.id))
              }
              disableRemove={draft.length <= 1 && index === 0}
            />
          ))
        )}
      </div>
    </section>
  );
};
