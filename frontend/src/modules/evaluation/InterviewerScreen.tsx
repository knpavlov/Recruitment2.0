import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import {
  InterviewerAssignmentView,
  InterviewStatusRecord,
  OfferRecommendation,
  OverallImpression
} from '../../shared/types/evaluation';
import { CaseFolder } from '../../shared/types/caseLibrary';
import { ApiError } from '../../shared/api/httpClient';

type AssignmentStatus = 'assigned' | 'in-progress' | 'completed';

interface Banner {
  type: 'info' | 'error';
  text: string;
}

interface CriterionFormValue {
  score: string;
  notes: string;
}

interface FormState {
  fitCriteria: Record<string, CriterionFormValue>;
  caseCriteria: Record<string, CriterionFormValue>;
  fitSummary: string;
  caseSummary: string;
  interestLevel: string;
  issuesToTest: string;
  overallImpression: OverallImpression | '';
  offerRecommendation: OfferRecommendation | '';
  followUpPlan: string;
  comments: string;
}

const emptyCriterion = (): CriterionFormValue => ({ score: '', notes: '' });

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  'in-progress': 'In progress',
  completed: 'Completed'
};

const STATUS_CLASS_NAMES: Record<AssignmentStatus, string> = {
  assigned: styles.statusPillPending,
  'in-progress': styles.statusPillProgress,
  completed: styles.statusPillCompleted
};

// Вспомогательная функция для выявления того, что в форме уже есть черновые данные
const hasDraftValues = (form: InterviewerAssignmentView['form']): boolean => {
  if (!form || form.submitted) {
    return false;
  }
  if (form.fitNotes?.trim() || form.caseNotes?.trim() || form.notes?.trim()) {
    return true;
  }
  if (form.interestLevel?.trim() || form.issuesToTest?.trim() || form.followUpPlan?.trim()) {
    return true;
  }
  if (form.overallImpression || form.offerRecommendation) {
    return true;
  }
  const hasCriteriaDraft = (items: InterviewStatusRecord['fitCriteria']) =>
    items?.some((item) => Boolean(item?.score) || Boolean(item?.notes?.trim())) ?? false;
  return hasCriteriaDraft(form.fitCriteria) || hasCriteriaDraft(form.caseCriteria);
};

// Статус карточки интервью с учётом черновиков и отправленных форм
const resolveAssignmentStatus = (assignment: InterviewerAssignmentView): AssignmentStatus => {
  if (assignment.form?.submitted) {
    return 'completed';
  }
  return hasDraftValues(assignment.form) ? 'in-progress' : 'assigned';
};

const mapCriteriaState = (
  ids: string[],
  stored: InterviewerAssignmentView['form'] | null,
  selector: 'fitCriteria' | 'caseCriteria'
): Record<string, CriterionFormValue> => {
  const result: Record<string, CriterionFormValue> = {};
  const storedMap = new Map<string, CriterionFormValue>();
  if (stored?.[selector]) {
    for (const item of stored[selector]) {
      if (!item || !item.criterionId) {
        continue;
      }
      storedMap.set(item.criterionId, {
        score: item.score ? String(item.score) : '',
        notes: item.notes ?? ''
      });
    }
  }
  for (const id of ids) {
    result[id] = storedMap.get(id) ?? emptyCriterion();
  }
  if (ids.length === 0) {
    for (const [key, value] of storedMap.entries()) {
      result[key] = value;
    }
  }
  return result;
};

const createFormState = (assignment: InterviewerAssignmentView | null): FormState => {
  const fitCriteriaIds = assignment?.fitQuestion?.criteria?.map((item) => item.id) ?? [];
  const caseCriteriaIds = assignment?.caseFolder?.evaluationCriteria?.map((item) => item.id) ?? [];
  const form = assignment?.form ?? null;
  return {
    fitCriteria: mapCriteriaState(fitCriteriaIds, form, 'fitCriteria'),
    caseCriteria: mapCriteriaState(caseCriteriaIds, form, 'caseCriteria'),
    fitSummary: form?.fitNotes ?? '',
    caseSummary: form?.caseNotes ?? '',
    interestLevel: form?.interestLevel ?? '',
    issuesToTest: form?.issuesToTest ?? '',
    overallImpression: form?.overallImpression ?? '',
    offerRecommendation: form?.offerRecommendation ?? '',
    followUpPlan: form?.followUpPlan ?? '',
    comments: form?.notes ?? ''
  };
};

const parseScoreValue = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  if (parsed < 1 || parsed > 5) {
    return undefined;
  }
  return parsed;
};

const buildCriteriaPayload = (
  state: Record<string, CriterionFormValue>,
  ids: string[]
): { criterionId: string; score?: number; notes?: string }[] =>
  ids.map((id) => {
    const current = state[id] ?? emptyCriterion();
    const score = parseScoreValue(current.score);
    const notes = current.notes.trim() || undefined;
    return { criterionId: id, score: score ?? undefined, notes };
  });

const computeAverageScore = (items: Array<{ score?: number }>): number | undefined => {
  const valid = items
    .map((item) => (typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : undefined))
    .filter((value): value is number => value !== undefined);
  if (!valid.length) {
    return undefined;
  }
  const sum = valid.reduce((total, value) => total + value, 0);
  return Number((sum / valid.length).toFixed(2));
};

const SCORE_SCALE: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

const OVERALL_OPTIONS: Array<{ value: OverallImpression; label: string }> = [
  { value: 'top-choice', label: 'Outstanding – top choice' },
  { value: 'strong', label: 'Strong – would recommend' },
  { value: 'mixed', label: 'Mixed – some concerns' },
  { value: 'concerns', label: 'Weak – significant concerns' }
];

const OFFER_OPTIONS: Array<{ value: OfferRecommendation; label: string }> = [
  { value: 'yes-priority', label: 'Yes, priority' },
  { value: 'yes', label: 'Yes' },
  { value: 'hold', label: 'Hold / need more data' },
  { value: 'no', label: 'No' }
];

const formatDateTime = (value: string | undefined) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString('en-US');
  } catch {
    return value;
  }
};

export const InterviewerScreen = () => {
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<InterviewerAssignmentView[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(createFormState(null));

  const selectedAssignment = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    return assignments.find((item) => item.slotId === selectedSlot) ?? null;
  }, [assignments, selectedSlot]);

  const isSubmitted = selectedAssignment?.form?.submitted ?? false;
  const disableInputs = saving || isSubmitted;

  useEffect(() => {
    setFormState(createFormState(selectedAssignment));
  }, [selectedAssignment]);

  useEffect(() => {
    if (!session?.email) {
      setAssignments([]);
      setSelectedSlot(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const items = await interviewerApi.listAssignments(session.email);
        setAssignments(items);
        if (items.length && !selectedSlot) {
          setSelectedSlot(items[0].slotId);
        } else if (items.length === 0) {
          setSelectedSlot(null);
        } else if (selectedSlot) {
          const stillExists = items.some((item) => item.slotId === selectedSlot);
          if (!stillExists) {
            setSelectedSlot(items[0]?.slotId ?? null);
          }
        }
      } catch (error) {
        console.error('Failed to load interviewer assignments:', error);
        setBanner({ type: 'error', text: 'Assignments could not be loaded. Please refresh the page later.' });
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.email]);

  const refreshAssignments = async () => {
    if (!session?.email) {
      return;
    }
    try {
      const items = await interviewerApi.listAssignments(session.email);
      setAssignments(items);
      if (items.length === 0) {
        setSelectedSlot(null);
      } else if (selectedSlot) {
        const exists = items.some((item) => item.slotId === selectedSlot);
        if (!exists) {
          setSelectedSlot(items[0].slotId);
        }
      } else {
        setSelectedSlot(items[0].slotId);
      }
    } catch (error) {
      console.error('Failed to reload assignments:', error);
    }
  };

  const persistForm = async ({ submitted }: { submitted: boolean }) => {
    if (!session?.email || !selectedAssignment) {
      return;
    }
    if (submitted && selectedAssignment.form?.submitted) {
      setBanner({ type: 'error', text: 'This evaluation has already been submitted.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const fitIds = selectedAssignment.fitQuestion?.criteria?.map((item) => item.id) ?? Object.keys(formState.fitCriteria);
      const caseIds =
        selectedAssignment.caseFolder?.evaluationCriteria?.map((item) => item.id) ??
        Object.keys(formState.caseCriteria);
      const fitCriteriaPayload = buildCriteriaPayload(formState.fitCriteria, fitIds);
      const caseCriteriaPayload = buildCriteriaPayload(formState.caseCriteria, caseIds);
      const fitScore = computeAverageScore(fitCriteriaPayload);
      const caseScore = computeAverageScore(caseCriteriaPayload);
      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted,
        fitScore,
        caseScore,
        fitNotes: formState.fitSummary.trim() || undefined,
        caseNotes: formState.caseSummary.trim() || undefined,
        notes: formState.comments.trim() || undefined,
        interestLevel: formState.interestLevel.trim() || undefined,
        issuesToTest: formState.issuesToTest.trim() || undefined,
        overallImpression: formState.overallImpression || undefined,
        offerRecommendation: formState.offerRecommendation || undefined,
        followUpPlan: formState.followUpPlan.trim() || undefined,
        fitCriteria: fitCriteriaPayload,
        caseCriteria: caseCriteriaPayload
      });
      await refreshAssignments();
      setBanner({
        type: 'info',
        text: submitted ? 'Evaluation submitted. Thank you for your feedback!' : 'Draft saved.'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'access-denied') {
          setBanner({ type: 'error', text: 'You do not have access to this interview.' });
          return;
        }
        if (error.code === 'form-locked') {
          setBanner({ type: 'error', text: 'The evaluation is already locked and cannot be edited.' });
          return;
        }
      }
      console.error('Failed to submit interview form:', error);
      setBanner({ type: 'error', text: 'Could not save the form. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    void persistForm({ submitted: false });
  };

  const handleSubmitFinal = () => {
    void persistForm({ submitted: true });
  };

  const updateCriterionState = (category: 'fit' | 'case', id: string, patch: Partial<CriterionFormValue>) => {
    setFormState((prev) => {
      const source = category === 'fit' ? prev.fitCriteria : prev.caseCriteria;
      const nextMap = { ...source, [id]: { ...(source[id] ?? emptyCriterion()), ...patch } };
      return {
        ...prev,
        fitCriteria: category === 'fit' ? nextMap : prev.fitCriteria,
        caseCriteria: category === 'case' ? nextMap : prev.caseCriteria
      };
    });
  };

  const renderList = () => {
    if (loading) {
      return <p>Loading assignments…</p>;
    }
    if (assignments.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2>No assignments yet</h2>
          <p>When an administrator assigns an interview to you, it will appear in this list.</p>
        </div>
      );
    }
    return (
      <ul className={styles.list}>
        {assignments.map((assignment) => {
          const candidateName = assignment.candidate
            ? `${assignment.candidate.lastName} ${assignment.candidate.firstName}`.trim()
            : 'Candidate not assigned';
          const status = resolveAssignmentStatus(assignment);
          const statusLabel = STATUS_LABELS[status];
          const statusClass = STATUS_CLASS_NAMES[status];
          const submittedAt = assignment.form?.submittedAt;
          const timestampLabel =
            status === 'completed' && submittedAt
              ? `Submitted ${formatDateTime(submittedAt)}`
              : `Assigned ${formatDateTime(assignment.invitationSentAt)}`;
          return (
            <li
              key={assignment.slotId}
              className={`${styles.listItem} ${selectedSlot === assignment.slotId ? styles.listItemActive : ''}`}
              onClick={() => setSelectedSlot(assignment.slotId)}
            >
              <div className={styles.listItemStatusRow}>
                <span className={`${styles.statusPill} ${statusClass}`}>{statusLabel}</span>
                <span className={styles.listItemTimestamp}>{timestampLabel}</span>
              </div>
              <div className={styles.listItemTitle}>{candidateName}</div>
              {assignment.candidate?.desiredPosition && (
                <p className={styles.listItemRole}>{assignment.candidate.desiredPosition}</p>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFiles = (folder: CaseFolder | undefined) => {
    if (!folder || folder.files.length === 0) {
      return <p>No case files are attached.</p>;
    }
    return (
      <ul className={styles.fileList}>
        {folder.files.map((file) => (
          <li key={file.id} className={styles.fileItem}>
            <a href={file.dataUrl} download={file.fileName} className={styles.fileLink}>
              {file.fileName}
            </a>
          </li>
        ))}
      </ul>
    );
  };

  const renderDetail = () => {
    if (!selectedAssignment) {
      return (
        <div className={styles.emptyState}>
          <h2>Select an interview</h2>
          <p>Use the list on the left to open candidate materials and share your feedback.</p>
        </div>
      );
    }
    const candidate = selectedAssignment.candidate;
    const candidateName = candidate
      ? `${candidate.lastName} ${candidate.firstName}`.trim() || candidate.id
      : 'Candidate not assigned';
    const fitQuestion = selectedAssignment.fitQuestion;
    const fitCriteriaDefinitions = fitQuestion?.criteria ?? [];
    const caseCriteriaDefinitions = selectedAssignment.caseFolder?.evaluationCriteria ?? [];
    const submittedAtLabel = selectedAssignment.form?.submittedAt
      ? formatDateTime(selectedAssignment.form?.submittedAt)
      : null;
    const assignmentStatus = resolveAssignmentStatus(selectedAssignment);
    const statusBadgeClass =
      assignmentStatus === 'completed'
        ? styles.badgeSuccess
        : assignmentStatus === 'in-progress'
          ? styles.badgeWarning
          : styles.badgeInfo;
    const statusDetail =
      assignmentStatus === 'completed'
        ? submittedAtLabel
          ? `Submitted ${submittedAtLabel}`
          : 'Submitted'
        : assignmentStatus === 'in-progress'
          ? 'Draft in progress'
          : 'Awaiting feedback';

    const renderCriterionBlock = (
      category: 'fit' | 'case',
      definitions: Array<{ id: string; title: string; ratings?: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }>,
      emptyMessage: string
    ) => {
      if (!definitions.length) {
        return <p className={styles.emptyCriteria}>{emptyMessage}</p>;
      }

      return (
        <div className={styles.criteriaGrid}>
          {definitions.map((criterion) => {
            const state =
              (category === 'fit' ? formState.fitCriteria : formState.caseCriteria)[criterion.id] ??
              emptyCriterion();
            const selectedScore = parseScoreValue(state.score) as 1 | 2 | 3 | 4 | 5 | undefined;
            const currentDescription = selectedScore
              ? criterion.ratings?.[selectedScore]
              : undefined;
            const tooltipItems = SCORE_SCALE.filter((score) => Boolean(criterion.ratings?.[score])).map((score) => (
              <div key={score} className={styles.tooltipItem}>
                <span className={styles.tooltipScore}>{score}</span>
                <span className={styles.tooltipText}>{criterion.ratings?.[score]}</span>
              </div>
            ));
            const tooltip = tooltipItems.length ? (
              <span className={styles.tooltipWrapper}>
                <span className={styles.tooltipIcon} role="img" aria-label="Score descriptions">
                  ?
                </span>
                <span className={styles.tooltipBubble}>{tooltipItems}</span>
              </span>
            ) : null;

            return (
              <article key={criterion.id} className={styles.criterionCard}>
                <header className={styles.criterionCardHeader}>
                  <div>
                    <h4 className={styles.criterionTitle}>{criterion.title}</h4>
                    {currentDescription && <p className={styles.scoreActiveHint}>{currentDescription}</p>}
                  </div>
                  {tooltip}
                </header>
                <div className={styles.scoreSelector}>
                  {SCORE_SCALE.map((score) => {
                    const active = state.score === String(score);
                    const description = criterion.ratings?.[score];
                    return (
                      <button
                        key={score}
                        type="button"
                        className={`${styles.scoreButton} ${active ? styles.scoreButtonActive : ''}`}
                        disabled={disableInputs}
                        aria-pressed={active}
                        onClick={() =>
                          updateCriterionState(category, criterion.id, {
                            score: active ? '' : String(score)
                          })
                        }
                        title={description ? `${score}: ${description}` : String(score)}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
                <label
                  className={styles.criterionNotesLabel}
                  htmlFor={`${category}-criterion-notes-${criterion.id}`}
                >
                  Notes
                </label>
                <textarea
                  id={`${category}-criterion-notes-${criterion.id}`}
                  className={styles.criterionNotes}
                  rows={3}
                  value={state.notes}
                  disabled={disableInputs}
                  placeholder="Add comments"
                  onChange={(event) =>
                    updateCriterionState(category, criterion.id, { notes: event.target.value })
                  }
                />
              </article>
            );
          })}
        </div>
      );
    };

    const statusLabel = STATUS_LABELS[assignmentStatus];

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <p className={styles.detailMeta}>Assigned {formatDateTime(selectedAssignment.invitationSentAt)}</p>
          </div>
          <div className={styles.detailStatusGroup}>
            <span className={`${styles.badge} ${statusBadgeClass}`}>{statusLabel}</span>
            <span className={styles.detailStatusMeta}>{statusDetail}</span>
          </div>
        </div>
        <div className={styles.detailColumns}>
          <div className={styles.infoColumn}>
            <div className={styles.section}>
              <h3>Candidate</h3>
              <dl className={styles.infoGrid}>
                <div>
                  <dt>Target role</dt>
                  <dd>{candidate?.desiredPosition ?? '—'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{candidate?.city ?? '—'}</dd>
                </div>
                <div>
                  <dt>Interviewer</dt>
                  <dd>{selectedAssignment.interviewerName || '—'}</dd>
                </div>
              </dl>
              {candidate?.resume ? (
                <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
                  Download resume ({candidate.resume.fileName})
                </a>
              ) : (
                <p>Resume is not available.</p>
              )}
            </div>

            <div className={styles.section}>
              <h3>Case</h3>
              {selectedAssignment.caseFolder ? (
                <>
                  <p className={styles.sectionDescription}>{selectedAssignment.caseFolder.name}</p>
                  {renderFiles(selectedAssignment.caseFolder)}
                  {caseCriteriaDefinitions.length > 0 && (
                    <div className={styles.sectionListWrapper}>
                      <span className={styles.sectionListTitle}>Evaluation focus</span>
                      <ul className={styles.sectionList}>
                        {caseCriteriaDefinitions.map((criterion) => (
                          <li key={criterion.id}>{criterion.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p>No case assigned.</p>
              )}
            </div>

            <div className={styles.section}>
              <h3>Fit question</h3>
              {fitQuestion ? (
                <>
                  <p className={styles.fitQuestionTitle}>{fitQuestion.shortTitle}</p>
                  <p className={styles.fitQuestionContent}>{fitQuestion.content}</p>
                  {fitCriteriaDefinitions.length > 0 && (
                    <div className={styles.sectionListWrapper}>
                      <span className={styles.sectionListTitle}>Key competencies</span>
                      <ul className={styles.sectionList}>
                        {fitCriteriaDefinitions.map((criterion) => (
                          <li key={criterion.id}>{criterion.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p>Fit question is not assigned.</p>
              )}
            </div>
          </div>

          <div className={styles.formColumn}>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveDraft();
              }}
            >
              {isSubmitted && (
                <div className={styles.formNotice}>
                  This evaluation was submitted
                  {submittedAtLabel ? ` on ${submittedAtLabel}` : ''} and can no longer be edited.
                </div>
              )}

              <section className={styles.formSection}>
                <h3>Behavioral interview</h3>
                {renderCriterionBlock('fit', fitCriteriaDefinitions, 'No fit criteria configured for this question.')}
                <div className={styles.formRow}>
                  <label htmlFor="fitSummary">Fit summary</label>
                  <textarea
                    id="fitSummary"
                    rows={3}
                    value={formState.fitSummary}
                    disabled={disableInputs}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, fitSummary: event.target.value }))
                    }
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Case interview</h3>
                {renderCriterionBlock('case', caseCriteriaDefinitions, 'No case criteria are available for this case.')}
                <div className={styles.formRow}>
                  <label htmlFor="caseSummary">Case summary</label>
                  <textarea
                    id="caseSummary"
                    rows={3}
                    value={formState.caseSummary}
                    disabled={disableInputs}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, caseSummary: event.target.value }))
                    }
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Additional insights</h3>
                <div className={styles.formRow}>
                  <label htmlFor="interestLevel">Interest level</label>
                  <textarea
                    id="interestLevel"
                    rows={2}
                    value={formState.interestLevel}
                    disabled={disableInputs}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, interestLevel: event.target.value }))
                    }
                    placeholder="Did the candidate demonstrate interest in A&M?"
                  />
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="issuesToTest">Issues to test</label>
                  <textarea
                    id="issuesToTest"
                    rows={2}
                    value={formState.issuesToTest}
                    disabled={disableInputs}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, issuesToTest: event.target.value }))
                    }
                    placeholder="What should the next interviewer probe?"
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Summary & recommendation</h3>
                <div className={styles.choiceGroup}>
                  <span className={styles.choiceLabel}>Overall impression</span>
                  {OVERALL_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.choiceOption}>
                      <input
                        type="radio"
                        name="overallImpression"
                        value={option.value}
                        checked={formState.overallImpression === option.value}
                        disabled={disableInputs}
                        onChange={() =>
                          setFormState((prev) => ({ ...prev, overallImpression: option.value }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <div className={styles.choiceGroup}>
                  <span className={styles.choiceLabel}>Should we give an offer?</span>
                  {OFFER_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.choiceOption}>
                      <input
                        type="radio"
                        name="offerRecommendation"
                        value={option.value}
                        checked={formState.offerRecommendation === option.value}
                        disabled={disableInputs}
                        onChange={() =>
                          setFormState((prev) => ({ ...prev, offerRecommendation: option.value }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="followUpPlan">Next steps</label>
                  <textarea
                    id="followUpPlan"
                    rows={2}
                    value={formState.followUpPlan}
                    disabled={disableInputs}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, followUpPlan: event.target.value }))
                    }
                    placeholder="Recommended follow-up actions"
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Comments (optional)</h3>
                <textarea
                  id="generalNotes"
                  rows={4}
                  value={formState.comments}
                  disabled={disableInputs}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, comments: event.target.value }))
                  }
                />
              </section>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={disableInputs}
                  onClick={handleSaveDraft}
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isSubmitted || saving}
                  onClick={handleSubmitFinal}
                >
                  Submit evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <header>
        <h1>My interviews</h1>
        <p>All interview assignments assigned to you are collected in this workspace.</p>
      </header>

      {banner && (
        <div className={`${styles.banner} ${banner.type === 'info' ? styles.bannerInfo : styles.bannerError}`}>
          {banner.text}
        </div>
      )}

      <div className={styles.content}>
        <aside className={styles.listPanel}>
          <h2 className={styles.listTitle}>Assignments</h2>
          {renderList()}
        </aside>
        {renderDetail()}
      </div>
    </div>
  );
};
