import { ReactElement, useMemo } from 'react';
import styles from '../../../styles/EvaluationModal.module.css';
import {
  EvaluationConfig,
  EvaluationCriterionScore,
  OfferRecommendationValue
} from '../../../shared/types/evaluation';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  onClose: () => void;
  candidateName: string;
  candidatePosition: string;
  fitCriteriaIndex: Map<string, { title: string; ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }>;
  caseCriteriaIndex: Map<string, { title: string; ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }>;
  caseFolderNames: Map<string, string>;
  fitQuestionTitles: Map<string, string>;
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

const PROCESS_LABELS: Record<EvaluationConfig['processStatus'], string> = {
  draft: 'Draft',
  'in-progress': 'In progress',
  completed: 'Completed'
};

const formatCriterionScore = (value: EvaluationCriterionScore['score']) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';

type CriterionDictionary = Map<
  string,
  { title: string; ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }
>;

const describeCriteria = (
  scores: EvaluationCriterionScore[] | undefined,
  dictionary: CriterionDictionary
) => {
  if (!scores || scores.length === 0) {
    return [] as Array<{ id: string; title: string; score: number | undefined; description: string | null }>;
  }

  return scores.map((entry) => {
    const definition = dictionary.get(entry.criterionId);
    const title = definition?.title ?? 'Criterion';
    const hasNumericScore = typeof entry.score === 'number' && Number.isFinite(entry.score);
    const roundedScore = hasNumericScore ? Math.round(entry.score as number) : null;
    const ratingKey =
      roundedScore !== null && definition?.ratings && roundedScore in definition.ratings
        ? (roundedScore as 1 | 2 | 3 | 4 | 5)
        : null;
    const description = ratingKey && definition?.ratings[ratingKey] ? definition.ratings[ratingKey] ?? null : null;
    return { id: entry.criterionId, title, score: entry.score, description };
  });
};

const renderNote = (label: string, value: string | undefined) => {
  if (!value) {
    return null;
  }
  return (
    <div className={styles.noteBlock}>
      <span className={styles.noteLabel}>{label}</span>
      <p className={styles.noteValue}>{value}</p>
    </div>
  );
};

export const EvaluationStatusModal = ({
  evaluation,
  onClose,
  candidateName,
  candidatePosition,
  fitCriteriaIndex,
  caseCriteriaIndex,
  caseFolderNames,
  fitQuestionTitles
}: EvaluationStatusModalProps) => {
  const slotIndex = useMemo(() => new Map(evaluation.interviews.map((slot) => [slot.id, slot])), [
    evaluation.interviews
  ]);

  const submittedCount = evaluation.forms.filter((form) => form.submitted).length;
  const processLabel = PROCESS_LABELS[evaluation.processStatus];

  const sortedForms = useMemo(
    () =>
      [...evaluation.forms].sort((a, b) => {
        if (a.submitted === b.submitted) {
          return (a.interviewerName ?? '').localeCompare(b.interviewerName ?? '');
        }
        return a.submitted ? -1 : 1;
      }),
    [evaluation.forms]
  );

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
          <div className={styles.statusSummary}>
            <div>
              <h3 className={styles.summaryTitle}>{candidateName}</h3>
              <p className={styles.statusMeta}>{candidatePosition}</p>
              {evaluation.roundNumber ? (
                <p className={styles.statusMeta}>Round {evaluation.roundNumber}</p>
              ) : null}
            </div>
            <div className={styles.summaryStats}>
              <div className={styles.summaryChip}>
                <span>Total interviews</span>
                <strong>{evaluation.interviews.length}</strong>
              </div>
              <div className={styles.summaryChip}>
                <span>Submitted</span>
                <strong>{submittedCount}</strong>
              </div>
              <div className={styles.summaryChip}>
                <span>Process status</span>
                <strong>{processLabel}</strong>
              </div>
            </div>
          </div>

          {sortedForms.length === 0 ? (
            <p className={styles.statusIntro}>No interviewer feedback has been recorded yet.</p>
          ) : (
            <ul className={styles.statusList}>
              {sortedForms.map((form) => {
                const submittedLabel = form.submittedAt
                  ? `Submitted ${formatDateTime(form.submittedAt)}`
                  : 'Submitted';
                const offerLabel = form.offerRecommendation
                  ? OFFER_LABELS[form.offerRecommendation]
                  : null;
                const slot = slotIndex.get(form.slotId);
                const caseName = slot?.caseFolderId ? caseFolderNames.get(slot.caseFolderId) ?? '—' : '—';
                const fitTitle = slot?.fitQuestionId ? fitQuestionTitles.get(slot.fitQuestionId) ?? '—' : '—';
                const fitCriteria = describeCriteria(form.fitCriteria, fitCriteriaIndex);
                const caseCriteria = describeCriteria(form.caseCriteria, caseCriteriaIndex);
                const notes = [
                  renderNote('Fit notes', form.fitNotes),
                  renderNote('Case notes', form.caseNotes),
                  renderNote('Interest level', form.interestNotes),
                  renderNote('Issues to test next', form.issuesToTest),
                  renderNote('General notes', form.notes)
                ].filter((item): item is ReactElement => Boolean(item));

                return (
                  <li key={form.slotId} className={styles.statusCard}>
                    <div className={styles.statusCardHeader}>
                      <div className={styles.statusCardTitle}>
                        <h3>{form.interviewerName}</h3>
                        <p className={styles.statusMeta}>
                          {form.submitted ? submittedLabel : 'Awaiting submission'}
                        </p>
                        <p className={styles.statusMetaSecondary}>
                          Case: {caseName}
                          <span>•</span>
                          Fit: {fitTitle}
                        </p>
                      </div>
                      <div className={styles.statusBadgeGroup}>
                        <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                          {form.submitted ? 'Complete' : 'Pending'}
                        </span>
                        {offerLabel && (
                          <span
                            className={`${styles.offerBadge} ${
                              form.offerRecommendation
                                ? styles[`offerBadge_${form.offerRecommendation}`]
                                : ''
                            }`}
                          >
                            {offerLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.statusScoresRow}>
                      <div className={styles.statusScoreCard}>
                        <span>Fit score</span>
                        <strong>{formatScore(form.fitScore)}</strong>
                      </div>
                      <div className={styles.statusScoreCard}>
                        <span>Case score</span>
                        <strong>{formatScore(form.caseScore)}</strong>
                      </div>
                    </div>

                    <div className={styles.criteriaGrid}>
                      <div>
                        <h4 className={styles.criteriaTitle}>Fit criteria</h4>
                        {fitCriteria.length ? (
                          <ul className={styles.criteriaList}>
                            {fitCriteria.map((criterion) => (
                              <li key={criterion.id}>
                                <div className={styles.criteriaRow}>
                                  <span className={styles.criteriaName}>{criterion.title}</span>
                                  <span className={styles.criteriaScore}>{formatCriterionScore(criterion.score)}</span>
                                </div>
                                {criterion.description && (
                                  <p className={styles.criteriaDescription}>{criterion.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.emptyCriteria}>No ratings recorded yet.</p>
                        )}
                      </div>
                      <div>
                        <h4 className={styles.criteriaTitle}>Case criteria</h4>
                        {caseCriteria.length ? (
                          <ul className={styles.criteriaList}>
                            {caseCriteria.map((criterion) => (
                              <li key={criterion.id}>
                                <div className={styles.criteriaRow}>
                                  <span className={styles.criteriaName}>{criterion.title}</span>
                                  <span className={styles.criteriaScore}>{formatCriterionScore(criterion.score)}</span>
                                </div>
                                {criterion.description && (
                                  <p className={styles.criteriaDescription}>{criterion.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.emptyCriteria}>No ratings recorded yet.</p>
                        )}
                      </div>
                    </div>

                    {notes.length > 0 && <div className={styles.notesGrid}>{notes}</div>}
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
