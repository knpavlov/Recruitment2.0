import { ChangeEvent } from 'react';
import styles from '../../../styles/CaseCriteriaScreen.module.css';

type Score = 1 | 2 | 3 | 4 | 5;

interface CaseCriterionFormProps {
  index: number;
  title: string;
  ratings: Partial<Record<Score, string>>;
  disableRemove: boolean;
  onTitleChange: (value: string) => void;
  onRatingChange: (score: Score, value: string) => void;
  onRemove: () => void;
}

const handleTextChange = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  callback: (value: string) => void
) => {
  callback(event.target.value);
};

export const CaseCriterionForm = ({
  index,
  title,
  ratings,
  disableRemove,
  onTitleChange,
  onRatingChange,
  onRemove
}: CaseCriterionFormProps) => {
  const ratingEntries: Array<{ score: Score; value: string }> = (['1', '2', '3', '4', '5'] as const).map((label) => {
    const numeric = Number(label) as Score;
    const value = ratings[numeric] ?? '';
    return { score: numeric, value };
  });

  return (
    <div className={styles.criterionBlock}>
      <div className={styles.criterionHeader}>
        <h3>Criterion {index + 1}</h3>
        <button
          type="button"
          className={styles.removeCriterionButton}
          onClick={onRemove}
          disabled={disableRemove}
        >
          Remove
        </button>
      </div>
      <label className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>Title</span>
        <input
          value={title}
          onChange={(event) => handleTextChange(event, onTitleChange)}
          placeholder="e.g. Structured problem solving"
        />
      </label>
      <div className={styles.ratingsTable}>
        {ratingEntries.map(({ score, value }) => (
          <div className={styles.ratingRow} key={score}>
            <div className={styles.ratingLabel}>Score {score}</div>
            <textarea
              value={value}
              onChange={(event) => handleTextChange(event, (next) => onRatingChange(score, next))}
              placeholder="Describe the expected performance for this score"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
