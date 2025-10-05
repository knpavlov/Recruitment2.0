import styles from '../../../styles/EvaluationModal.module.css';
import { EvaluationConfig } from '../../../shared/types/evaluation';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  onClose: () => void;
}

export const EvaluationStatusModal = ({ evaluation, onClose }: EvaluationStatusModalProps) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Статус оценочных форм</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.statusContent}>
          <p className={styles.statusIntro}>
            Здесь отображаются формы, заполненные интервьюерами. Для бэкенда достаточно будет подставить реальные данные.
          </p>
          <ul className={styles.statusList}>
            {evaluation.forms.map((form) => (
              <li key={form.slotId} className={styles.statusRow}>
                <div>
                  <h3>{form.interviewerName}</h3>
                  <p className={styles.statusMeta}>
                    {form.submitted
                      ? `Форма получена ${form.submittedAt ? new Date(form.submittedAt).toLocaleString('ru-RU') : ''}`
                      : 'Ожидаем заполнения формы'}
                  </p>
                  {form.notes && <p className={styles.statusNotes}>{form.notes}</p>}
                </div>
                <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                  {form.submitted ? 'Готово' : 'Ожидается'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
