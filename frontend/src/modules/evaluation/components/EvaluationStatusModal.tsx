import styles from '../../../styles/EvaluationModal.module.css';
import { EvaluationConfig, OfferRecommendationValue } from '../../../shared/types/evaluation';

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
  typeof value === 'number' && Number.isFinite(value)
    ? (Math.round(value * 10) / 10).toFixed(1)
    : '—';

const OFFER_LABELS: Record<OfferRecommendationValue, string> = {
  yes_priority: 'Yes, priority',
  yes_strong: 'Yes, meets high bar',
  yes_keep_warm: 'Turndown, stay in contact',
  no_offer: 'Turndown'
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
                const offerLabel = form.offerRecommendation
                  ? OFFER_LABELS[form.offerRecommendation]
                  : null;
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
                      {form.interestNotes && (
                        <p className={styles.statusNotes}>
                          <strong>Interest level notes:</strong> {form.interestNotes}
                        </p>
                      )}
                      {form.issuesToTest && (
                        <p className={styles.statusNotes}>
                          <strong>Issues to Test in Next Interview:</strong> {form.issuesToTest}
                        </p>
                      )}
                      {offerLabel && (
                        <p className={styles.statusNotes}>
                          <strong>Offer decision:</strong> {offerLabel}
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
