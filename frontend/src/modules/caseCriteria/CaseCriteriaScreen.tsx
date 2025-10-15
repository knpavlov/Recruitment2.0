import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/CaseCriteriaScreen.module.css';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { CaseCriterion } from '../../shared/types/caseCriteria';
import { CaseCriterionEditor } from './components/CaseCriterionEditor';
import { generateId } from '../../shared/ui/generateId';

type Banner = { type: 'info' | 'error'; text: string } | null;

type DraftState = {
  id: string;
  title: string;
  ratings: CaseCriterion['ratings'];
  original: CaseCriterion | null;
  version: number;
  saving: boolean;
  feedback: { type: 'info' | 'error'; text: string } | null;
};

const cloneRatings = (source: CaseCriterion['ratings']): CaseCriterion['ratings'] => {
  const copy: CaseCriterion['ratings'] = {};
  for (const score of [1, 2, 3, 4, 5] as const) {
    const value = source[score];
    if (typeof value === 'string') {
      copy[score] = value;
    }
  }
  return copy;
};

const ratingsEqual = (a: CaseCriterion['ratings'], b: CaseCriterion['ratings']): boolean => {
  for (const score of [1, 2, 3, 4, 5] as const) {
    const left = a[score]?.trim() ?? '';
    const right = b[score]?.trim() ?? '';
    if (left !== right) {
      return false;
    }
  }
  return true;
};

const hasDraftChanges = (draft: DraftState): boolean => {
  if (!draft.original) {
    return draft.title.trim().length > 0 || Object.values(draft.ratings).some((value) => (value ?? '').trim());
  }
  const sameTitle = draft.title.trim() === draft.original.title.trim();
  const sameRatings = ratingsEqual(draft.ratings, draft.original.ratings);
  return !(sameTitle && sameRatings);
};

const buildCriterionPayload = (draft: DraftState): CaseCriterion => ({
  id: draft.id,
  title: draft.title,
  ratings: draft.ratings,
  version: draft.original?.version ?? draft.version,
  createdAt: draft.original?.createdAt ?? new Date().toISOString(),
  updatedAt: draft.original?.updatedAt ?? new Date().toISOString()
});

export const CaseCriteriaScreen = () => {
  const { list, saveCriterion, removeCriterion } = useCaseCriteriaState();
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [banner, setBanner] = useState<Banner>(null);

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, DraftState> = {};
      for (const criterion of list) {
        const existing = prev[criterion.id];
        const base: DraftState = existing
          ? {
              ...existing,
              original: criterion,
              version: criterion.version,
              saving: false
            }
          : {
              id: criterion.id,
              title: criterion.title,
              ratings: cloneRatings(criterion.ratings),
              original: criterion,
              version: criterion.version,
              saving: false,
              feedback: null
            };

        if (!existing || !hasDraftChanges(existing)) {
          base.title = criterion.title;
          base.ratings = cloneRatings(criterion.ratings);
        }

        next[criterion.id] = base;
      }

      for (const draft of Object.values(prev)) {
        if (draft.original === null) {
          next[draft.id] = draft;
        }
      }

      return next;
    });
  }, [list]);

  const orderedDrafts = useMemo(() => {
    return Object.values(drafts).sort((a, b) => {
      const aTime = a.original ? new Date(a.original.updatedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.original ? new Date(b.original.updatedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return bTime - aTime;
    });
  }, [drafts]);

  const updateDraft = (id: string, updater: (draft: DraftState) => DraftState) => {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) {
        return prev;
      }
      return { ...prev, [id]: updater(current) };
    });
  };

  const handleAddDraft = () => {
    const id = generateId();
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        id,
        title: '',
        ratings: {},
        original: null,
        version: 1,
        saving: false,
        feedback: null
      }
    }));
  };

  const handleSave = async (draft: DraftState) => {
    const payload = buildCriterionPayload(draft);
    updateDraft(draft.id, (current) => ({ ...current, saving: true, feedback: null }));
    const expectedVersion = draft.original ? draft.original.version : null;
    const result = await saveCriterion(payload, expectedVersion);
    if (!result.ok) {
      updateDraft(draft.id, (current) => ({
        ...current,
        saving: false,
        feedback: {
          type: 'error',
          text:
            result.error === 'version-conflict'
              ? 'Не удалось сохранить: данные устарели. Обновите страницу.'
              : result.error === 'invalid-input'
                ? 'Проверьте корректность полей и попробуйте снова.'
                : 'Сохранение не удалось. Повторите попытку.'
        }
      }));
      return;
    }

    const saved = result.data;
    setBanner({ type: 'info', text: draft.original ? 'Критерий обновлён.' : 'Критерий создан.' });
    updateDraft(draft.id, () => ({
      id: saved.id,
      title: saved.title,
      ratings: cloneRatings(saved.ratings),
      original: saved,
      version: saved.version,
      saving: false,
      feedback: { type: 'info', text: 'Изменения сохранены.' }
    }));
  };

  const handleReset = (draft: DraftState) => {
    if (draft.original) {
      updateDraft(draft.id, (current) => ({
        ...current,
        title: draft.original!.title,
        ratings: cloneRatings(draft.original!.ratings),
        feedback: null
      }));
    } else {
      updateDraft(draft.id, (current) => ({ ...current, title: '', ratings: {}, feedback: null }));
    }
  };

  const handleDelete = async (draft: DraftState) => {
    if (!draft.original) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draft.id];
        return next;
      });
      return;
    }
    updateDraft(draft.id, (current) => ({ ...current, saving: true, feedback: null }));
    const result = await removeCriterion(draft.id);
    if (!result.ok) {
      updateDraft(draft.id, (current) => ({
        ...current,
        saving: false,
        feedback: { type: 'error', text: 'Не удалось удалить критерий. Попробуйте позже.' }
      }));
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[draft.id];
      return next;
    });
    setBanner({ type: 'info', text: 'Критерий удалён.' });
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Case criteria</h1>
          <p className={styles.subtitle}>
            Управляйте глобальными критериями оценки кейсов. Они используются в формах интервьюеров.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={handleAddDraft}>
            Добавить критерий
          </button>
        </div>
      </header>

      {banner && (
        <div className={`${styles.banner} ${banner.type === 'info' ? styles.bannerInfo : styles.bannerError}`}>
          {banner.text}
        </div>
      )}

      {orderedDrafts.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Критерии ещё не добавлены</h2>
          <p>Используйте кнопку «Добавить критерий», чтобы создать первый шаблон оценки.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {orderedDrafts.map((draft) => (
            <CaseCriterionEditor
              key={draft.id}
              title={draft.title}
              ratings={draft.ratings}
              onTitleChange={(value) => updateDraft(draft.id, (current) => ({
                ...current,
                title: value,
                feedback: null
              }))}
              onRatingChange={(score, value) =>
                updateDraft(draft.id, (current) => {
                  const trimmed = value.trim();
                  if (!trimmed) {
                    const { [score]: _removed, ...rest } = current.ratings;
                    return { ...current, ratings: rest, feedback: null };
                  }
                  return {
                    ...current,
                    ratings: { ...current.ratings, [score]: value },
                    feedback: null
                  };
                })
              }
              onSave={() => void handleSave(draft)}
              onReset={() => handleReset(draft)}
              onDelete={() => void handleDelete(draft)}
              saving={draft.saving}
              canSave={hasDraftChanges(draft) && draft.title.trim().length > 0}
              canReset={hasDraftChanges(draft)}
              isNew={draft.original === null}
              feedback={draft.feedback}
            />
          ))}
        </div>
      )}
    </section>
  );
};
