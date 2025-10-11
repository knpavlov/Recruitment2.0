import styles from '../../../styles/EvaluationCard.module.css';
import { EvaluationConfig } from '../../../shared/types/evaluation';

interface EvaluationCardProps {
  evaluation: EvaluationConfig;
  candidateName: string;
  onEdit: () => void;
  onOpenStatus: () => void;
}

export const EvaluationCard = ({ evaluation, candidateName, onEdit, onOpenStatus }: EvaluationCardProps) => {
  const completedForms = evaluation.forms.filter((form) => form.submitted).length;
  const roundLabel = evaluation.roundNumber ? `Round ${evaluation.roundNumber}` : 'Round —';
  return (
    <div className={styles.card}>
      <div>
        <h3>
          {candidateName || 'Not selected'} · {roundLabel}
        </h3>
        <p className={styles.meta}>Interviews: {evaluation.interviewCount}</p>
        <p className={styles.meta}>Forms: {completedForms}/{evaluation.interviewCount}</p>
        <p className={styles.meta}>Avg fit score: —</p>
        <p className={styles.meta}>Avg case score: —</p>
      </div>
      <div className={styles.actions}>
        <button className={styles.secondaryButton} onClick={onEdit}>
          Edit
        </button>
        <button className={styles.primaryButton} onClick={onOpenStatus}>
          Status
        </button>
      </div>
    </div>
  );
};
