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
        <h3>Оценка #{evaluation.id.slice(0, 6)}</h3>
        <p className={styles.meta}>Кандидат: {candidateName}</p>
        <p className={styles.meta}>
          Интервью: {evaluation.interviewCount} · Формы: {completedForms}/{evaluation.interviewCount}
        </p>
      </div>
      <div className={styles.actions}>
        <button className={styles.secondaryButton} onClick={onEdit}>
          Редактировать
        </button>
        <button className={styles.primaryButton} onClick={onOpenStatus}>
          Статус
        </button>
      </div>
    </div>
  );
};
