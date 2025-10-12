import styles from '../../../styles/EvaluationStatusModal.module.css';
import { EvaluationConfig, OfferRecommendationValue } from '../../../shared/types/evaluation';
import { FitQuestion } from '../../../shared/types/fitQuestion';
import { CaseFolder } from '../../../shared/types/caseLibrary';

interface EvaluationStatusModalProps {
  evaluation: EvaluationConfig;
  candidateName: string;
  candidatePosition: string;
  roundLabel: string;
  fitQuestions: FitQuestion[];
  caseFolders: CaseFolder[];
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

const formatScore = (value: number | undefined | null) =>
  typeof value === 'number' && Number.isFinite(value)
    ? (Math.round(value * 10) / 10).toFixed(1)
    : '—';

const OFFER_LABELS: Record<OfferRecommendationValue, string> = {
  yes_priority: 'Yes, priority',
  yes_strong: 'Yes, meets high bar',
  yes_keep_warm: 'Turndown, stay in contact',
  no_offer: 'Turndown'
};

const buildCriteriaTitleMap = (fitQuestions: FitQuestion[], caseFolders: CaseFolder[]) => {
  const fitMap = new Map<string, string>();
  for (const question of fitQuestions) {
    for (const criterion of question.criteria) {
      fitMap.set(criterion.id, criterion.title);
    }
  }

  const caseMap = new Map<string, string>();
  for (const folder of caseFolders) {
    for (const criterion of folder.evaluationCriteria) {
      caseMap.set(criterion.id, criterion.title);
    }
  }

  return { fitMap, caseMap };
};

const computeAverageScore = (values: Array<number | undefined | null>) => {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!numeric.length) {
    return null;
  }
  const total = numeric.reduce((sum, current) => sum + current, 0);
  return Math.round((total / numeric.length) * 10) / 10;
};

const formatProcessStatus = (status: EvaluationConfig['processStatus']) => {
  if (status === 'in-progress') {
    return 'In progress';
  }
  if (status === 'completed') {
    return 'Completed';
  }
  return 'Draft';
};

export const EvaluationStatusModal = ({
  evaluation,
  candidateName,
  candidatePosition,
  roundLabel,
  fitQuestions,
  caseFolders,
  onClose
}: EvaluationStatusModalProps) => {
  const submittedForms = evaluation.forms.filter((form) => form.submitted);
  const avgFitScore = computeAverageScore(submittedForms.map((form) => form.fitScore));
  const avgCaseScore = computeAverageScore(submittedForms.map((form) => form.caseScore));
  const formsPlanned = evaluation.interviews.length || evaluation.interviewCount;
  const { fitMap, caseMap } = buildCriteriaTitleMap(fitQuestions, caseFolders);

  const detailedForms = evaluation.forms.map((form) => {
    const safeName = form.interviewerName.trim().length ? form.interviewerName : 'Interviewer';
    const fitCriteriaMap = new Map(
      (form.fitCriteria ?? []).map((criterion) => [criterion.criterionId, formatScore(criterion.score)])
    );
    const caseCriteriaMap = new Map(
      (form.caseCriteria ?? []).map((criterion) => [criterion.criterionId, formatScore(criterion.score)])
    );

    return {
      form,
      interviewerName: safeName,
      statusLabel: form.submitted ? 'Complete' : 'Pending',
      fitScoreLabel: formatScore(form.fitScore),
      caseScoreLabel: formatScore(form.caseScore),
      offerLabel: form.offerRecommendation ? OFFER_LABELS[form.offerRecommendation] : '—',
      fitCriteriaMap,
      caseCriteriaMap
    };
  });

  const fitCriteriaOrder = Array.from(
    new Set(
      evaluation.forms.flatMap((form) => (form.fitCriteria ?? []).map((criterion) => criterion.criterionId))
    )
  );

  const caseCriteriaOrder = Array.from(
    new Set(
      evaluation.forms.flatMap((form) => (form.caseCriteria ?? []).map((criterion) => criterion.criterionId))
    )
  );

  const comparisonColumns = detailedForms.map((entry) => ({
    key: entry.form.slotId,
    title: entry.interviewerName
  }));

  const summaryRows = detailedForms.length
    ? [
        {
          key: 'status',
          label: 'Status',
          values: detailedForms.map((entry) => entry.statusLabel)
        },
        {
          key: 'fitScore',
          label: 'Fit score',
          values: detailedForms.map((entry) => entry.fitScoreLabel)
        },
        {
          key: 'caseScore',
          label: 'Case score',
          values: detailedForms.map((entry) => entry.caseScoreLabel)
        },
        {
          key: 'offer',
          label: 'Offer decision',
          values: detailedForms.map((entry) => entry.offerLabel)
        }
      ]
    : [];

  const fitRows = fitCriteriaOrder.map((criterionId) => ({
    key: `fit-${criterionId}`,
    label: fitMap.get(criterionId) ?? 'Fit criterion',
    values: detailedForms.map((entry) => entry.fitCriteriaMap.get(criterionId) ?? '—')
  }));

  const caseRows = caseCriteriaOrder.map((criterionId) => ({
    key: `case-${criterionId}`,
    label: caseMap.get(criterionId) ?? 'Case criterion',
    values: detailedForms.map((entry) => entry.caseCriteriaMap.get(criterionId) ?? '—')
  }));

  const comparisonRows = [
    ...(summaryRows.length
      ? ([{ type: 'section' as const, key: 'summary', label: 'Overall results' }] as const)
      : []),
    ...summaryRows.map((row) => ({ ...row, type: 'value' as const })),
    ...(fitRows.length
      ? ([{ type: 'section' as const, key: 'fit', label: 'Fit criteria' }] as const)
      : []),
    ...fitRows.map((row) => ({ ...row, type: 'value' as const })),
    ...(caseRows.length
      ? ([{ type: 'section' as const, key: 'case', label: 'Case criteria' }] as const)
      : []),
    ...caseRows.map((row) => ({ ...row, type: 'value' as const }))
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Evaluation form status</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div className={styles.content}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryDetails}>
              <h3>{candidateName}</h3>
              <p>{candidatePosition}</p>
              <p>{roundLabel}</p>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Forms submitted</p>
                <p className={styles.metricValue}>
                  {submittedForms.length}/{formsPlanned}
                </p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Avg fit score</p>
                <p className={styles.metricValue}>{formatScore(avgFitScore)}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Avg case score</p>
                <p className={styles.metricValue}>{formatScore(avgCaseScore)}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Process status</p>
                <p className={styles.metricValue}>{formatProcessStatus(evaluation.processStatus)}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className={styles.sectionTitle}>Interviewer feedback</h3>
            <p className={styles.sectionSubtitle}>
              Review detailed scores, notes and offer recommendations for every interviewer.
            </p>
            {evaluation.forms.length === 0 ? (
              <p className={styles.emptyState}>No interviewer feedback has been recorded yet.</p>
            ) : (
              <>
                <div className={styles.tableSection}>
                  <div className={styles.tableIntro}>
                    <h4>Interview comparison</h4>
                    <p>Quickly compare status and scores for every interviewer.</p>
                  </div>
                  <div className={styles.tableScroll}>
                    <table className={styles.interviewerTable}>
                      <thead>
                        <tr>
                          <th>Metric</th>
                          {comparisonColumns.map((column) => (
                            <th key={column.key}>{column.title}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row) => {
                          if (row.type === 'section') {
                            return (
                              <tr key={row.key} className={styles.tableSectionRow}>
                                <th colSpan={comparisonColumns.length + 1}>{row.label}</th>
                              </tr>
                            );
                          }

                          return (
                            <tr key={row.key}>
                              <th>{row.label}</th>
                              {row.values.map((value, index) => (
                                <td key={`${row.key}-${comparisonColumns[index]?.key}`}>{value}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <ul className={styles.formList}>
                  {detailedForms.map((entry) => {
                    const { form } = entry;
                    const submittedLabel = form.submittedAt
                      ? `Submitted ${formatDateTime(form.submittedAt)}`
                      : 'Awaiting submission';

                    const fitCriteria = (form.fitCriteria ?? []).map((criterion) => ({
                      id: criterion.criterionId,
                      title: fitMap.get(criterion.criterionId) ?? 'Fit criterion',
                      score: formatScore(criterion.score)
                    }));

                    const caseCriteria = (form.caseCriteria ?? []).map((criterion) => ({
                      id: criterion.criterionId,
                      title: caseMap.get(criterion.criterionId) ?? 'Case criterion',
                      score: formatScore(criterion.score)
                    }));

                    return (
                      <li key={form.slotId} className={styles.formCard}>
                        <div className={styles.formHeader}>
                          <div>
                            <h3>{entry.interviewerName}</h3>
                            <p className={styles.formMeta}>{submittedLabel}</p>
                          </div>
                          <span
                            className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}
                          >
                            {form.submitted ? 'Complete' : 'Pending'}
                          </span>
                        </div>

                        <div className={styles.scoreRow}>
                          <div className={styles.scoreCard}>
                            <span className={styles.scoreLabel}>Fit score</span>
                            <span className={styles.scoreValue}>{formatScore(form.fitScore)}</span>
                          </div>
                          <div className={styles.scoreCard}>
                            <span className={styles.scoreLabel}>Case score</span>
                            <span className={styles.scoreValue}>{formatScore(form.caseScore)}</span>
                          </div>
                          {form.offerRecommendation && (
                            <div className={styles.scoreCard}>
                              <span className={styles.scoreLabel}>Offer decision</span>
                              <span className={styles.scoreValue}>
                                {OFFER_LABELS[form.offerRecommendation]}
                              </span>
                            </div>
                          )}
                        </div>

                        {(fitCriteria.length > 0 || caseCriteria.length > 0) && (
                          <div className={styles.criteriaBlock}>
                            {fitCriteria.length > 0 && (
                              <div>
                                <p className={styles.criteriaTitle}>Fit criteria</p>
                                <div className={styles.criteriaList}>
                                  {fitCriteria.map((criterion) => (
                                    <div key={criterion.id} className={styles.criterionRow}>
                                      <span className={styles.criterionTitle}>{criterion.title}</span>
                                      <span className={styles.criterionScore}>{criterion.score}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {caseCriteria.length > 0 && (
                              <div>
                                <p className={styles.criteriaTitle}>Case criteria</p>
                                <div className={styles.criteriaList}>
                                  {caseCriteria.map((criterion) => (
                                    <div key={criterion.id} className={styles.criterionRow}>
                                      <span className={styles.criterionTitle}>{criterion.title}</span>
                                      <span className={styles.criterionScore}>{criterion.score}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className={styles.notesBlock}>
                          {form.fitNotes && (
                            <p className={styles.noteRow}>
                              <strong>Fit notes:</strong> {form.fitNotes}
                            </p>
                          )}
                          {form.caseNotes && (
                            <p className={styles.noteRow}>
                              <strong>Case notes:</strong> {form.caseNotes}
                            </p>
                          )}
                          {form.interestNotes && (
                            <p className={styles.noteRow}>
                              <strong>Interest level notes:</strong> {form.interestNotes}
                            </p>
                          )}
                          {form.issuesToTest && (
                            <p className={styles.noteRow}>
                              <strong>Issues to test in next interview:</strong> {form.issuesToTest}
                            </p>
                          )}
                          {form.notes && (
                            <p className={styles.noteRow}>
                              <strong>General notes:</strong> {form.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
