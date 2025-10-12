import { ReactNode } from 'react';
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

type EvaluationForm = EvaluationConfig['forms'][number];

type ComparisonRow = {
  id: string;
  label: string;
  renderCell: (form: EvaluationForm) => ReactNode;
};

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

const buildSubmittedLabel = (form: EvaluationForm) =>
  form.submittedAt ? `Submitted ${formatDateTime(form.submittedAt)}` : 'Awaiting submission';

const collectCriteriaRows = (
  forms: EvaluationForm[],
  type: 'fit' | 'case',
  titleMap: Map<string, string>
): ComparisonRow[] => {
  const seen = new Set<string>();
  const rows: ComparisonRow[] = [];

  forms.forEach((form) => {
    const criteria = type === 'fit' ? form.fitCriteria ?? [] : form.caseCriteria ?? [];
    criteria.forEach((criterion) => {
      if (!criterion.criterionId || seen.has(criterion.criterionId)) {
        return;
      }
      seen.add(criterion.criterionId);
      rows.push({
        id: `${type}-${criterion.criterionId}`,
        label: titleMap.get(criterion.criterionId) ?? (type === 'fit' ? 'Fit criterion' : 'Case criterion'),
        renderCell: (currentForm) => {
          const list = type === 'fit' ? currentForm.fitCriteria ?? [] : currentForm.caseCriteria ?? [];
          const match = list.find((item) => item.criterionId === criterion.criterionId);
          return formatScore(match?.score);
        }
      });
    });
  });

  return rows;
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
  const forms = evaluation.forms;
  const comparisonRows: ComparisonRow[] = [
    {
      id: 'status',
      label: 'Submission status',
      renderCell: (form) => (
        <span className={form.submitted ? styles.statusBadgeSuccess : styles.statusBadgePending}>
          {form.submitted ? 'Complete' : 'Pending'}
        </span>
      )
    },
    {
      id: 'fit-score',
      label: 'Fit score',
      renderCell: (form) => formatScore(form.fitScore)
    },
    {
      id: 'case-score',
      label: 'Case score',
      renderCell: (form) => formatScore(form.caseScore)
    },
    {
      id: 'offer-decision',
      label: 'Offer decision',
      renderCell: (form) => (form.offerRecommendation ? OFFER_LABELS[form.offerRecommendation] : '—')
    }
  ];
  const fitCriteriaRows = collectCriteriaRows(forms, 'fit', fitMap);
  const caseCriteriaRows = collectCriteriaRows(forms, 'case', caseMap);

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
            {forms.length === 0 ? (
              <p className={styles.emptyState}>No interviewer feedback has been recorded yet.</p>
            ) : (
              <>
                <div className={styles.overviewTableSection}>
                  <div className={styles.tableIntro}>
                    <h4 className={styles.overviewTitle}>Score comparison</h4>
                    <p className={styles.overviewDescription}>
                      Quickly compare scores, recommendations and criteria assessments across interviewers.
                    </p>
                  </div>
                  <div className={styles.tableScroll}>
                    <table className={styles.overviewTable}>
                      <thead>
                        <tr>
                          <th className={styles.metricColumnHeader}>Metric</th>
                          {forms.map((form) => (
                            <th key={form.slotId}>
                              <div className={styles.columnHeader}>
                                <span className={styles.columnTitle}>{form.interviewerName || 'Interviewer'}</span>
                                <span className={styles.columnSubtitle}>{buildSubmittedLabel(form)}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row) => (
                          <tr key={row.id}>
                            <th scope="row" className={styles.metricCell}>
                              {row.label}
                            </th>
                            {forms.map((form) => (
                              <td key={`${row.id}-${form.slotId}`} className={styles.valueCell}>
                                {row.renderCell(form)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {fitCriteriaRows.length > 0 && (
                          <>
                            <tr className={styles.rowDivider}>
                              <th colSpan={forms.length + 1}>Fit criteria</th>
                            </tr>
                            {fitCriteriaRows.map((row) => (
                              <tr key={row.id}>
                                <th scope="row" className={styles.metricCell}>
                                  {row.label}
                                </th>
                                {forms.map((form) => (
                                  <td key={`${row.id}-${form.slotId}`} className={styles.valueCell}>
                                    {row.renderCell(form)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                        {caseCriteriaRows.length > 0 && (
                          <>
                            <tr className={styles.rowDivider}>
                              <th colSpan={forms.length + 1}>Case criteria</th>
                            </tr>
                            {caseCriteriaRows.map((row) => (
                              <tr key={row.id}>
                                <th scope="row" className={styles.metricCell}>
                                  {row.label}
                                </th>
                                {forms.map((form) => (
                                  <td key={`${row.id}-${form.slotId}`} className={styles.valueCell}>
                                    {row.renderCell(form)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <h4 className={styles.detailSectionTitle}>Detailed feedback</h4>
                <ul className={styles.formList}>
                  {forms.map((form) => {
                    const submittedLabel = form.submittedAt
                      ? `Submitted ${formatDateTime(form.submittedAt)}`
                      : 'Awaiting submission';
                    const offerLabel = form.offerRecommendation
                      ? OFFER_LABELS[form.offerRecommendation]
                    : null;

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
                          <h3>{form.interviewerName}</h3>
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
                        {offerLabel && (
                          <div className={styles.scoreCard}>
                            <span className={styles.scoreLabel}>Offer decision</span>
                            <span className={styles.scoreValue}>{offerLabel}</span>
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
