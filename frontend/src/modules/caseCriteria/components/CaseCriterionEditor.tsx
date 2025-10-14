import styles from '../../../styles/CaseCriteriaScreen.module.css';

interface CaseCriterionEditorProps {
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  onTitleChange: (value: string) => void;
  onRatingChange: (score: 1 | 2 | 3 | 4 | 5, value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
  saving: boolean;
  canSave: boolean;
  canReset: boolean;
  isNew: boolean;
  feedback: { type: 'info' | 'error'; text: string } | null;
}

const SCORE_OPTIONS: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export const CaseCriterionEditor = ({
  title,
  ratings,
  onTitleChange,
  onRatingChange,
  onSave,
  onReset,
  onDelete,
  saving,
  canSave,
  canReset,
  isNew,
  feedback
}: CaseCriterionEditorProps) => (
  <article className={styles.criterionCard}>
    <header className={styles.criterionHeader}>
      <div>
        <h3>{isNew ? 'Новый критерий' : 'Критерий оценки'}</h3>
        <p className={styles.subtitle}>Заполните название и опциональные описания по шкале 1-5.</p>
      </div>
    </header>

    <label className={styles.fieldGroup}>
      <span>Название критерия</span>
      <input
        type="text"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={'Например, "Структура решения"'}
        disabled={saving}
      />
    </label>

    <div className={styles.ratingsTable}>
      {SCORE_OPTIONS.map((score) => (
        <label key={score} className={styles.ratingRow}>
          <span className={styles.ratingLabel}>Оценка {score}</span>
          <textarea
            className={styles.ratingTextarea}
            value={ratings[score] ?? ''}
            onChange={(event) => onRatingChange(score, event.target.value)}
            placeholder="Описание уровня (необязательно)"
            rows={3}
            disabled={saving}
          />
        </label>
      ))}
    </div>

    {feedback && (
      <div className={feedback.type === 'info' ? styles.feedbackInfo : styles.feedbackError}>{feedback.text}</div>
    )}

    <div className={styles.cardActions}>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onReset}
        disabled={!canReset || saving}
      >
        Сбросить изменения
      </button>
      <button
        type="button"
        className={styles.dangerButton}
        onClick={onDelete}
        disabled={saving}
      >
        {isNew ? 'Удалить' : 'Удалить критерий'}
      </button>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={onSave}
        disabled={!canSave || saving}
      >
        {saving ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  </article>
);
