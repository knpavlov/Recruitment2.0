import { CaseCriterion } from '../../../shared/types/caseCriteria';
import styles from '../../../styles/CaseCriteriaScreen.module.css';

interface CaseCriterionEditorProps {
  criterion: CaseCriterion;
  onChange: (next: CaseCriterion) => void;
  onRemove: () => void;
}

export const CaseCriterionEditor = ({ criterion, onChange, onRemove }: CaseCriterionEditorProps) => {
  const updateTitle = (value: string) => {
    onChange({ ...criterion, title: value });
  };

  const updateRating = (score: 1 | 2 | 3 | 4 | 5, value: string) => {
    const nextRatings = { ...criterion.ratings };
    const trimmed = value.trim();
    if (trimmed) {
      nextRatings[score] = value;
    } else {
      delete nextRatings[score];
    }
    onChange({ ...criterion, ratings: nextRatings });
  };

  return (
    <div className={styles.criterionCard}>
      <div className={styles.criterionHeader}>
        <h3>Критерий оценки</h3>
        <button type="button" className={styles.dangerButton} onClick={onRemove}>
          Удалить
        </button>
      </div>
      <label className={styles.fieldGroup}>
        <span>Название критерия</span>
        <input
          value={criterion.title}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="Например, структурирование решения"
        />
      </label>
      <div className={styles.ratingsTable}>
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className={styles.ratingRow}>
            <span className={styles.ratingLabel}>Оценка {score}</span>
            <textarea
              className={styles.ratingTextarea}
              value={criterion.ratings[score as 1 | 2 | 3 | 4 | 5] ?? ''}
              onChange={(event) => updateRating(score as 1 | 2 | 3 | 4 | 5, event.target.value)}
              placeholder="Опишите, что означает эта оценка"
              rows={3}
            />
          </label>
        ))}
      </div>
    </div>
  );
};
