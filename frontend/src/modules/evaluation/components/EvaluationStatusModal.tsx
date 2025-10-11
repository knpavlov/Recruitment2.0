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
          {evaluation.forms.length === 0 ? (
            <p className={styles.statusIntro}>No interview feedback has been captured yet.</p>
          ) : (
            <ul className={styles.statusList}>
              {evaluation.forms.map((form) => {
                const submittedLabel = form.submitted
                  ? `Submitted ${
                      form.submittedAt
                        ? new Date(form.submittedAt).toLocaleString('en-GB', {
                            hour12: false,
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''
                    }`
                  : 'Waiting for submission';
                const fitScore = form.fitScore != null ? form.fitScore : '—';
                const caseScore = form.caseScore != null ? form.caseScore : '—';
                return (
                  <li key={form.slotId} className={styles.statusRow}>
                    <div>
                      <h3>{form.interviewerName}</h3>
                      <p className={styles.statusMeta}>{submittedLabel}</p>
                      <div className={styles.statusScores}>
                        <span>Fit: {fitScore}</span>
                        <span>Case: {caseScore}</span>
                      </div>
                      {form.fitNotes && (
                        <p className={styles.statusNotes}>Fit notes: {form.fitNotes}</p>
                      )}
                      {form.caseNotes && (
                        <p className={styles.statusNotes}>Case notes: {form.caseNotes}</p>
                      )}
                      {form.notes && <p className={styles.statusNotes}>General notes: {form.notes}</p>}
                    </div>
                    <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                      {form.submitted ? 'Complete' : 'Pending'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
