import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/CaseCriteriaScreen.module.css';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { CaseCriterion, CaseCriterionDraft } from '../../shared/types/caseCriteria';
import { CaseCriterionForm } from './components/CaseCriterionForm';

interface Banner {
  type: 'info' | 'error';
  text: string;
}

type EditorItem = {
  localId: string;
  id: string | null;
  title: string;
  ratings: CaseCriterion['ratings'];
};

const generateLocalId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2)}`;
};

const mapRemoteToEditor = (criterion: CaseCriterion): EditorItem => ({
  localId: criterion.id,
  id: criterion.id,
  title: criterion.title,
  ratings: { ...criterion.ratings }
});

const createEmptyEditorItem = (): EditorItem => ({
  localId: generateLocalId(),
  id: null,
  title: '',
  ratings: {}
});

const sanitizeDrafts = (items: EditorItem[]): CaseCriterionDraft[] | null => {
  const drafts: CaseCriterionDraft[] = items.map((item) => {
    const title = item.title.trim();
    const ratings: CaseCriterion['ratings'] = {};
    for (const score of [1, 2, 3, 4, 5] as const) {
      const source = item.ratings[score];
      if (typeof source === 'string') {
        const trimmed = source.trim();
        if (trimmed) {
          ratings[score] = trimmed;
        }
      }
    }
    return {
      id: item.id ?? undefined,
      title,
      ratings
    } satisfies CaseCriterionDraft;
  });

  if (drafts.some((draft) => !draft.title)) {
    return null;
  }

  return drafts;
};

export const CaseCriteriaScreen = () => {
  const { list, version, saveSet, reload } = useCaseCriteriaState();
  const [items, setItems] = useState<EditorItem[]>(() => list.map(mapRemoteToEditor));
  const [currentVersion, setCurrentVersion] = useState<number | null>(version ?? null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isDirty || isSaving) {
      return;
    }
    setItems(list.map(mapRemoteToEditor));
    setCurrentVersion(version ?? null);
  }, [list, version, isDirty, isSaving]);

  const hasCriteria = items.length > 0;
  const versionLabel = useMemo(() => (currentVersion ? `Version ${currentVersion}` : 'Version —'), [currentVersion]);

  const updateItem = (localId: string, updater: (previous: EditorItem) => EditorItem) => {
    setItems((prev) => prev.map((item) => (item.localId === localId ? updater(item) : item)));
    setIsDirty(true);
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, createEmptyEditorItem()]);
    setIsDirty(true);
  };

  const handleRemove = (localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
    setIsDirty(true);
  };

  const handleReset = () => {
    setItems(list.map(mapRemoteToEditor));
    setCurrentVersion(version ?? null);
    setIsDirty(false);
    setBanner(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setBanner(null);
    const drafts = sanitizeDrafts(items);
    if (!drafts) {
      setBanner({ type: 'error', text: 'Fill in titles for all criteria before saving.' });
      setIsSaving(false);
      return;
    }
    try {
      const result = await saveSet(drafts, currentVersion);
      if (!result.ok) {
        if (result.error === 'version-conflict') {
          setBanner({
            type: 'error',
            text: 'Could not save: criteria were updated elsewhere. Refreshing the list.'
          });
          try {
            await reload();
          } catch (error) {
            console.error('Failed to reload case criteria after conflict:', error);
          }
        } else if (result.error === 'invalid-input') {
          setBanner({ type: 'error', text: 'Invalid data. Check the fields and try again.' });
        } else {
          setBanner({ type: 'error', text: 'Failed to save changes. Please retry.' });
        }
        return;
      }
      setItems(result.data.items.map(mapRemoteToEditor));
      setCurrentVersion(result.data.version);
      setIsDirty(false);
      setBanner({ type: 'info', text: 'Case criteria saved.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Case criteria</h1>
          <p className={styles.subtitle}>
            Configure the rubric that interviewers use to score the case portion of their evaluations.
          </p>
        </div>
        <span className={styles.versionBadge}>{versionLabel}</span>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.editorCard}>
        <div className={styles.criteriaHeader}>
          <div>
            <h2>Evaluation criteria</h2>
            <p className={styles.mutedText}>
              Add detailed descriptions for scores 1–5 so interviewers can evaluate candidates consistently.
            </p>
          </div>
          <div className={styles.actionsRow}>
            <button type="button" className={styles.secondaryButton} onClick={handleAdd} disabled={isSaving}>
              Add criterion
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleReset}
              disabled={!isDirty || isSaving}
            >
              Reset changes
            </button>
          </div>
        </div>

        {hasCriteria ? (
          <div className={styles.criteriaList}>
            {items.map((item, index) => (
              <CaseCriterionForm
                key={item.localId}
                index={index}
                title={item.title}
                ratings={item.ratings}
                disableRemove={isSaving}
                onTitleChange={(value) =>
                  updateItem(item.localId, (previous) => ({ ...previous, title: value }))
                }
                onRatingChange={(score, value) =>
                  updateItem(item.localId, (previous) => ({
                    ...previous,
                    ratings: { ...previous.ratings, [score]: value }
                  }))
                }
                onRemove={() => handleRemove(item.localId)}
              />
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>No case criteria yet. Use “Add criterion” to create the first one.</p>
        )}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? 'Saving…' : 'Save criteria'}
          </button>
        </div>
      </div>
    </section>
  );
};
