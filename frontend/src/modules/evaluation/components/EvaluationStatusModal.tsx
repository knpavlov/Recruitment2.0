import { useMemo } from 'react';
import styles from '../../../styles/EvaluationModal.module.css';
import {
  EvaluationConfig,
  EvaluationCriterionScore,
  OfferRecommendationValue
} from '../../../shared/types/evaluation';
import { CaseFolder } from '../../../shared/types/caseLibrary';
import { FitQuestion } from '../../../shared/types/fitQuestion';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  onClose: () => void;
  folders: CaseFolder[];
  fitQuestions: FitQuestion[];
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

const normalizeCriteriaDetails = (
  scores: EvaluationCriterionScore[] | undefined,
  definitions: { id: string; title: string; ratings?: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }[] | undefined
) => {
  if (!scores || scores.length === 0) {
    return [] as Array<{ id: string; title: string; score: string; description?: string }>;
  }

  const definitionIndex = new Map(
    (definitions ?? []).map((criterion) => [criterion.id, criterion])
  );

  return scores.map((entry) => {
    const definition = definitionIndex.get(entry.criterionId);
    const rawScore = typeof entry.score === 'number' && Number.isFinite(entry.score) ? entry.score : null;
    const formattedScore = rawScore !== null ? formatScore(rawScore) : '—';
    const rounded = rawScore !== null ? Math.round(rawScore) : null;
    const ratingHint =
      rounded && rounded >= 1 && rounded <= 5 && definition?.ratings
        ? definition.ratings[rounded as 1 | 2 | 3 | 4 | 5]
        : undefined;
    return {
      id: entry.criterionId,
      title: definition?.title ?? 'Untitled criterion',
      score: formattedScore,
      description: ratingHint ?? undefined
    };
  });
};

const OFFER_LABELS: Record<OfferRecommendationValue, string> = {
  yes_priority: 'Yes, priority',
  yes_strong: 'Yes, meets high bar',
  yes_keep_warm: 'Turndown, stay in contact',
  no_offer: 'Turndown'
};

export const EvaluationStatusModal = ({ evaluation, onClose, folders, fitQuestions }: EvaluationStatusModalProps) => {
  const slotIndex = useMemo(() => new Map(evaluation.interviews.map((slot) => [slot.id, slot])), [
    evaluation.interviews
  ]);
  const fitIndex = useMemo(() => new Map(fitQuestions.map((question) => [question.id, question])), [
    fitQuestions
  ]);
  const caseIndex = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);

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
                const slot = slotIndex.get(form.slotId);
                const fitQuestion = slot?.fitQuestionId ? fitIndex.get(slot.fitQuestionId) : undefined;
                const caseFolder = slot?.caseFolderId ? caseIndex.get(slot.caseFolderId) : undefined;
                const fitCriteria = normalizeCriteriaDetails(form.fitCriteria, fitQuestion?.criteria);
                const caseCriteria = normalizeCriteriaDetails(
                  form.caseCriteria,
                  caseFolder?.evaluationCriteria
                );
                const hasAdditionalNotes = Boolean(
                  form.interestNotes || form.issuesToTest || offerLabel || form.notes
                );
                return (
                  <li key={form.slotId} className={styles.statusRow}>
                    <div className={styles.statusHeaderRow}>
                      <div>
                        <h3>{form.interviewerName}</h3>
                        <p className={styles.statusMeta}>
                          {form.submitted ? submittedLabel : 'Awaiting submission'}
                        </p>
                        <div className={styles.statusAssignments}>
                          {fitQuestion && (
                            <span>
                              Fit: <strong>{fitQuestion.shortTitle || fitQuestion.content}</strong>
                            </span>
                          )}
                          {caseFolder && (
                            <span>
                              Case: <strong>{caseFolder.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
                        {form.submitted ? 'Complete' : 'Pending'}
                      </span>
                    </div>

                    <div className={styles.statusScoreGrid}>
                      <section className={styles.statusScoreCard}>
                        <header className={styles.scoreCardHeader}>
                          <span className={styles.scoreCardTitle}>Fit interview</span>
                          <span className={styles.scoreCardValue}>{formatScore(form.fitScore)}</span>
                        </header>
                        {fitCriteria.length > 0 ? (
                          <ul className={styles.criteriaList}>
                            {fitCriteria.map((criterion) => (
                              <li key={criterion.id} className={styles.criteriaItem}>
                                <div className={styles.criteriaHeader}>
                                  <span className={styles.criteriaTitle}>{criterion.title}</span>
                                  <span className={styles.criteriaScore}>{criterion.score}</span>
                                </div>
                                {criterion.description && (
                                  <p className={styles.criteriaHint}>{criterion.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.criteriaEmpty}>No detailed ratings provided.</p>
                        )}
                        {form.fitNotes && (
                          <p className={styles.statusNotes}>
                            <strong>Fit notes:</strong> {form.fitNotes}
                          </p>
                        )}
                      </section>

                      <section className={styles.statusScoreCard}>
                        <header className={styles.scoreCardHeader}>
                          <span className={styles.scoreCardTitle}>Case interview</span>
                          <span className={styles.scoreCardValue}>{formatScore(form.caseScore)}</span>
                        </header>
                        {caseCriteria.length > 0 ? (
                          <ul className={styles.criteriaList}>
                            {caseCriteria.map((criterion) => (
                              <li key={criterion.id} className={styles.criteriaItem}>
                                <div className={styles.criteriaHeader}>
                                  <span className={styles.criteriaTitle}>{criterion.title}</span>
                                  <span className={styles.criteriaScore}>{criterion.score}</span>
                                </div>
                                {criterion.description && (
                                  <p className={styles.criteriaHint}>{criterion.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.criteriaEmpty}>No detailed ratings provided.</p>
                        )}
                        {form.caseNotes && (
                          <p className={styles.statusNotes}>
                            <strong>Case notes:</strong> {form.caseNotes}
                          </p>
                        )}
                      </section>
                    </div>

                    {hasAdditionalNotes && (
                      <div className={styles.statusExtraNotes}>
                        {form.interestNotes && (
                          <div className={styles.extraNote}>
                            <h4>Candidate motivation</h4>
                            <p>{form.interestNotes}</p>
                          </div>
                        )}
                        {form.issuesToTest && (
                          <div className={styles.extraNote}>
                            <h4>Issues to test next</h4>
                            <p>{form.issuesToTest}</p>
                          </div>
                        )}
                        {offerLabel && (
                          <div className={`${styles.extraNote} ${styles.offerNote}`}>
                            <h4>Offer decision</h4>
                            <p>{offerLabel}</p>
                          </div>
                        )}
                        {form.notes && (
                          <div className={styles.extraNote}>
                            <h4>General notes</h4>
                            <p>{form.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
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
