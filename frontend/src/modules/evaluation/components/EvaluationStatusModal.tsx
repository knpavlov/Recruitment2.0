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
          <h2>Evaluation form status</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.statusContent}>
          <p className={styles.statusIntro}>
            This modal displays interviewer submissions. Replace the mocked data with real backend responses later.
          </p>
          <ul className={styles.statusList}>
            {evaluation.forms.map((form) => (
              <li key={form.slotId} className={styles.statusRow}>
                <div>
                  <h3>{form.interviewerName}</h3>
                  <p className={styles.statusMeta}>
                    {form.submitted
                      ? `Form received ${form.submittedAt ? new Date(form.submittedAt).toLocaleString('en-US') : ''}`
                      : 'Awaiting form submission'}
                  </p>
                  {form.notes && <p className={styles.statusNotes}>{form.notes}</p>}
                </div>
                <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                  {form.submitted ? 'Done' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
