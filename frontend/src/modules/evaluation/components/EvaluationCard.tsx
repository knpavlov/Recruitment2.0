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
  return (
    <div className={styles.card}>
      <div>
        <h3>Evaluation #{evaluation.id.slice(0, 6)}</h3>
        <p className={styles.meta}>Candidate: {candidateName}</p>
        <p className={styles.meta}>
          Interviews: {evaluation.interviewCount} · Forms: {completedForms}/{evaluation.interviewCount}
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
