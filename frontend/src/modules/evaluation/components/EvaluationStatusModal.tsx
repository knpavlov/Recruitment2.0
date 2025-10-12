import styles from '../../../styles/EvaluationModal.module.css';
import { EvaluationConfig, OfferRecommendation, OverallImpression } from '../../../shared/types/evaluation';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  onClose: () => void;
}

const formatDateTime = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  try {
    return new Date(value).toLocaleString('en-US');
  } catch {
    return value;
  }
};

const formatScore = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toString() : '—';

const OFFER_LABELS: Record<OfferRecommendation, string> = {
  'yes-priority': 'Yes, priority',
  yes: 'Yes',
  hold: 'Hold / need more data',
  no: 'No'
};

const OVERALL_LABELS: Record<OverallImpression, string> = {
  'top-choice': 'Outstanding – top choice',
  strong: 'Strong – would recommend',
  mixed: 'Mixed – some concerns',
  concerns: 'Weak – significant concerns'
};

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
            <p className={styles.statusIntro}>No interviewer feedback has been recorded yet.</p>
          ) : (
            <ul className={styles.statusList}>
              {evaluation.forms.map((form) => {
                const submittedLabel = form.submittedAt
                  ? `Submitted ${formatDateTime(form.submittedAt)}`
                  : 'Submitted';
                return (
                  <li key={form.slotId} className={styles.statusRow}>
                    <div>
                      <h3>{form.interviewerName}</h3>
                      <p className={styles.statusMeta}>
                        {form.submitted ? submittedLabel : 'Awaiting submission'}
                      </p>
                      <div className={styles.statusScores}>
                        <div className={styles.statusScore}>
                          <span>Fit</span>
                          <strong>{formatScore(form.fitScore)}</strong>
                        </div>
                        <div className={styles.statusScore}>
                          <span>Case</span>
                          <strong>{formatScore(form.caseScore)}</strong>
                        </div>
                      </div>
                      {form.overallImpression && (
                        <p className={styles.statusNotes}>
                          <strong>Overall impression:</strong> {OVERALL_LABELS[form.overallImpression]}
                        </p>
                      )}
                      {form.offerRecommendation && (
                        <p className={styles.statusNotes}>
                          <strong>Offer decision:</strong> {OFFER_LABELS[form.offerRecommendation]}
                        </p>
                      )}
                      {form.interestLevel && (
                        <p className={styles.statusNotes}>
                          <strong>Interest level:</strong> {form.interestLevel}
                        </p>
                      )}
                      {form.issuesToTest && (
                        <p className={styles.statusNotes}>
                          <strong>Issues to test:</strong> {form.issuesToTest}
                        </p>
                      )}
                      {form.followUpPlan && (
                        <p className={styles.statusNotes}>
                          <strong>Next steps:</strong> {form.followUpPlan}
                        </p>
                      )}
                      {form.fitNotes && (
                        <p className={styles.statusNotes}>
                          <strong>Fit notes:</strong> {form.fitNotes}
                        </p>
                      )}
                      {form.caseNotes && (
                        <p className={styles.statusNotes}>
                          <strong>Case notes:</strong> {form.caseNotes}
                        </p>
                      )}
                      {form.notes && (
                        <p className={styles.statusNotes}>
                          <strong>General notes:</strong> {form.notes}
                        </p>
                      )}
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
