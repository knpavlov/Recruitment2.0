import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/CaseCriteriaScreen.module.css';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { CaseCriterion } from '../../shared/types/caseCriteria';
import { generateId } from '../../shared/ui/generateId';
import { CaseCriterionEditor } from './components/CaseCriterionEditor';

type Feedback = { type: 'info' | 'error'; text: string } | null;

const createEmptyCriterion = (): CaseCriterion => ({
  id: generateId(),
  title: '',
  ratings: {}
});

export const CaseCriteriaScreen = () => {
  const { criteria, version, updatedAt, saveCriteria } = useCaseCriteriaState();
  const [draft, setDraft] = useState<CaseCriterion[]>(criteria);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setDraft(criteria);
  }, [criteria, version]);

  const formattedUpdatedAt = useMemo(() => {
    if (!updatedAt) {
      return '—';
    }
    try {
      return new Date(updatedAt).toLocaleString('ru-RU');
    } catch {
      return updatedAt;
    }
  }, [updatedAt]);

  const updateCriterion = (id: string, next: CaseCriterion) => {
    setDraft((prev) => prev.map((item) => (item.id === id ? next : item)));
    setFeedback(null);
  };

  const removeCriterion = (id: string) => {
    setDraft((prev) => prev.filter((item) => item.id !== id));
    setFeedback(null);
  };

  const normalizeCriteria = (items: CaseCriterion[]): CaseCriterion[] =>
    items.map((item) => {
      const ratings: CaseCriterion['ratings'] = {};
      (Object.entries(item.ratings) as Array<[string, string]>).forEach(([score, value]) => {
        const trimmed = value.trim();
        if (trimmed) {
          const key = Number(score) as 1 | 2 | 3 | 4 | 5;
          ratings[key] = trimmed;
        }
      });
      return {
        ...item,
        title: item.title.trim(),
        ratings
      };
    });

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    const normalized = normalizeCriteria(draft);
    const hasEmptyTitle = normalized.some((item) => item.title.length === 0);
    if (hasEmptyTitle) {
      setFeedback({ type: 'error', text: 'Заполните название для каждого критерия.' });
      setIsSaving(false);
      return;
    }

    const result = await saveCriteria(normalized, version);
    if (!result.ok) {
      const message =
        result.error === 'version-conflict'
          ? 'Кто-то уже обновил критерии. Обновите страницу, чтобы увидеть актуальную версию.'
          : result.error === 'invalid-input'
            ? 'Проверьте заполнение полей и попробуйте ещё раз.'
            : 'Не удалось сохранить изменения. Попробуйте позже.';
      setFeedback({ type: 'error', text: message });
      setIsSaving(false);
      return;
    }

    setDraft(result.data.criteria);
    setFeedback({ type: 'info', text: 'Критерии успешно сохранены.' });
    setIsSaving(false);
  };

  const handleReset = () => {
    setDraft(criteria);
    setFeedback(null);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Case Criteria</h1>
          <p className={styles.subtitle}>Опишите стандартизированные критерии оценки кейса для интервьюеров.</p>
          <p className={styles.metaInfo}>Последнее обновление: {formattedUpdatedAt}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReset}
            disabled={isSaving}
          >
            Отменить изменения
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение…' : 'Сохранить' }
          </button>
        </div>
      </header>

      {feedback && (
        <div className={feedback.type === 'info' ? styles.feedbackInfo : styles.feedbackError}>{feedback.text}</div>
      )}

      <div className={styles.listHeader}>
        <h2>Критерии</h2>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setDraft((prev) => [...prev, createEmptyCriterion()]);
            setFeedback(null);
          }}
          disabled={isSaving}
        >
          Добавить критерий
        </button>
      </div>

      {draft.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Пока ни одного критерия</h2>
          <p>Добавьте первый критерий, чтобы интервьюеры могли оценивать кейс по заданной шкале.</p>
        </div>
      ) : (
        <div className={styles.criteriaList}>
          {draft.map((criterion) => (
            <CaseCriterionEditor
              key={criterion.id}
              criterion={criterion}
              onChange={(next) => updateCriterion(criterion.id, next)}
              onRemove={() => removeCriterion(criterion.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
