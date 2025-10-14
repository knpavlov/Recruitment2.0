import { CaseEvaluationCriterion } from '../../../shared/types/caseLibrary';
import styles from '../../../styles/CaseCriterionEditor.module.css';

interface CaseCriterionEditorProps {
  criterion: CaseEvaluationCriterion;
  onChange: (next: CaseEvaluationCriterion) => void;
  onRemove: () => void;
  disableRemove?: boolean;
}

export const CaseCriterionEditor = ({ criterion, onChange, onRemove, disableRemove }: CaseCriterionEditorProps) => {
  const handleTitleChange = (value: string) => {
    onChange({ ...criterion, title: value });
  };

  const handleRatingChange = (score: 1 | 2 | 3 | 4 | 5, value: string) => {
    const nextRatings: CaseEvaluationCriterion['ratings'] = { ...criterion.ratings };
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
        <h3>Evaluation criterion</h3>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          disabled={disableRemove}
        >
          Remove
        </button>
      </div>
      <label className={styles.fieldGroup}>
        <span>Criterion title</span>
        <input
          type="text"
          value={criterion.title}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="Enter criterion title"
        />
      </label>
      <div className={styles.ratingsGrid}>
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className={styles.ratingField}>
            <span className={styles.ratingLabel}>Score {score}</span>
            <textarea
              value={criterion.ratings[score as 1 | 2 | 3 | 4 | 5] ?? ''}
              onChange={(event) => handleRatingChange(score as 1 | 2 | 3 | 4 | 5, event.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </label>
        ))}
      </div>
    </div>
  );
};
