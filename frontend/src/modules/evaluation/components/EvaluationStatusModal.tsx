import styles from '../../../styles/EvaluationModal.module.css';
import { EvaluationConfig } from '../../../shared/types/evaluation';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  onClose: () => void;
}

export const EvaluationStatusModal = ({ evaluation, onClose }: EvaluationStatusModalProps) => {
  const formsBySlot = new Map(evaluation.forms.map((form) => [form.slotId, form]));

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
          <p className={styles.statusIntro}>Monitor interviewer submissions and review their notes below.</p>
          <ul className={styles.statusList}>
            {evaluation.interviews.map((slot) => {
              const form = formsBySlot.get(slot.id);
              const submitted = form?.submitted ?? false;
              const submittedAtLabel = submitted && form?.submittedAt
                ? new Date(form.submittedAt).toLocaleString('en-US')
                : null;
              const fitScoreLabel = form?.fitScore != null ? form.fitScore : '—';
              const caseScoreLabel = form?.caseScore != null ? form.caseScore : '—';

              return (
                <li key={slot.id} className={styles.statusRow}>
                  <div>
                    <h3>{form?.interviewerName ?? slot.interviewerName}</h3>
                    <p className={styles.statusMeta}>
                      {submitted
                        ? submittedAtLabel
                          ? `Submitted ${submittedAtLabel}`
                          : 'Submitted'
                        : 'Awaiting submission'}
                    </p>
                    <div className={styles.statusScores}>
                      <span>Fit score: {fitScoreLabel}</span>
                      <span>Case score: {caseScoreLabel}</span>
                    </div>
                    {form?.fitNotes && (
                      <p className={styles.statusNotes}>
                        <strong>Fit feedback:</strong> {form.fitNotes}
                      </p>
                    )}
                    {form?.caseNotes && (
                      <p className={styles.statusNotes}>
                        <strong>Case feedback:</strong> {form.caseNotes}
                      </p>
                    )}
                    {form?.notes && (
                      <p className={styles.statusNotes}>
                        <strong>General notes:</strong> {form.notes}
                      </p>
                    )}
                  </div>
                  <span className={submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                    {submitted ? 'Complete' : 'Pending'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
