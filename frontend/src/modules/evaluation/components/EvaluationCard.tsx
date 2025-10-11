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
  const displayedCandidate = candidateName || 'Not selected';
  const roundLabel = evaluation.roundNumber ? `Round ${evaluation.roundNumber}` : 'Round not set';
  const formsLabel = `Forms: ${completedForms}/${evaluation.interviewCount}`;
  const avgFitPlaceholder = 'Avg fit: —';
  const avgCasePlaceholder = 'Avg case: —';
  return (
    <div className={styles.card}>
      <div>
        <h3>
          {displayedCandidate} · {roundLabel}
        </h3>
        <p className={styles.meta}>{formsLabel}</p>
        <p className={styles.meta}>
          {avgFitPlaceholder} · {avgCasePlaceholder}
        </p>
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
