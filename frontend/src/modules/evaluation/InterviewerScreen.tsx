import { Fragment, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import {
  InterviewerAssignmentView,
  OfferRecommendationValue,
  EvaluationCriterionScore
} from '../../shared/types/evaluation';
import { CaseFolder } from '../../shared/types/caseLibrary';
import { ApiError } from '../../shared/api/httpClient';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { formatDate } from '../../shared/utils/date';
import { formatFirstLastName } from '../../shared/utils/personName';

interface Banner {
  type: 'info' | 'error';
  text: string;
}

type CriterionDefinition = {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
};

type CriterionScoreValue = '1' | '2' | '3' | '4' | '5' | 'n/a';

interface FormState {
  fitNotes: string;
  caseNotes: string;
  notes: string;
  interestNotes: string;
  issuesToTest: string;
  offerRecommendation: OfferRecommendationValue | '';
  fitCriteria: Record<string, string>;
  caseCriteria: Record<string, string>;
}

interface CriterionSelectorProps {
  criterion: CriterionDefinition;
  value: string;
  disabled: boolean;
  onChange: (next: CriterionScoreValue) => void;
}

const CriterionSelector = ({ criterion, value, disabled, onChange }: CriterionSelectorProps) => {
  const numericScores = ['1', '2', '3', '4', '5'] as const;
  const ratingEntries: Array<{ score: CriterionScoreValue; description?: string }> = [
    ...numericScores.map((score) => ({
      score,
      description: criterion.ratings[Number(score) as 1 | 2 | 3 | 4 | 5]
    })),
    { score: 'n/a', description: 'Not applicable' }
  ];

  return (
    <div className={styles.criterionCard}>
      <div className={styles.criterionHeaderRow}>
        <span className={styles.criterionTitle}>{criterion.title}</span>
        <span className={styles.tooltipWrapper}>
          <span className={styles.tooltipIcon}>?</span>
          <span className={styles.tooltipContent}>
            {ratingEntries.map(({ score, description }) => (
              <Fragment key={score}>
                <strong>{score === 'n/a' ? 'N/A' : score}</strong>
                <span>{description ?? '—'}</span>
              </Fragment>
            ))}
          </span>
        </span>
      </div>
      <div className={styles.criterionScale}>
        {ratingEntries.map(({ score }) => (
          <label key={score} className={styles.criterionOption}>
            <input
              type="radio"
              name={criterion.id}
              value={score}
              checked={value === score}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value as CriterionScoreValue)}
            />
            <span>{score === 'n/a' ? 'N/A' : score}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const createFormState = (assignment: InterviewerAssignmentView | null): FormState => {
  if (!assignment?.form) {
    return {
      fitNotes: '',
      caseNotes: '',
      notes: '',
      interestNotes: '',
      issuesToTest: '',
      offerRecommendation: '',
      fitCriteria: {},
      caseCriteria: {}
    };
  }
  const toCriteriaMap = (entries: EvaluationCriterionScore[] | undefined): Record<string, string> => {
    if (!entries) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const item of entries) {
      if (item.criterionId) {
        if (item.notApplicable) {
          map[item.criterionId] = 'n/a';
        } else {
          map[item.criterionId] = item.score != null ? String(item.score) : '';
        }
      }
    }
    return map;
  };
  return {
    fitNotes: assignment.form.fitNotes ?? '',
    caseNotes: assignment.form.caseNotes ?? '',
    notes: assignment.form.notes ?? '',
    interestNotes: assignment.form.interestNotes ?? '',
    issuesToTest: assignment.form.issuesToTest ?? '',
    offerRecommendation: assignment.form.offerRecommendation ?? '',
    fitCriteria: toCriteriaMap(assignment.form.fitCriteria),
    caseCriteria: toCriteriaMap(assignment.form.caseCriteria)
  };
};

const OFFER_OPTIONS: Array<{ value: OfferRecommendationValue; label: string }> = [
  { value: 'yes_priority', label: 'Yes, priority' },
  { value: 'yes_strong', label: 'Yes, meets high bar' },
  { value: 'yes_keep_warm', label: 'Turndown, stay in contact' },
  { value: 'no_offer', label: 'Turndown' }
];

const computeAverageScore = (values: Record<string, string>): number | null => {
  const numericValues = Object.values(values)
    .map((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value): value is number => value != null);
  if (!numericValues.length) {
    return null;
  }
  const sum = numericValues.reduce((total, current) => total + current, 0);
  return Math.round((sum / numericValues.length) * 10) / 10;
};

const formatScoreValue = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return (Math.round(value * 10) / 10).toFixed(1);
};

const isRatingComplete = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'n/a') {
    return true;
  }
  return ['1', '2', '3', '4', '5'].includes(normalized);
};

const areRatingsComplete = (criteria: CriterionDefinition[], values: Record<string, string>): boolean => {
  if (criteria.length === 0) {
    return true;
  }
  return criteria.every((criterion) => isRatingComplete(values[criterion.id]));
};

const CASE_CRITERIA_ORDER = [
  'Conceptual problem solving / Problem Structuring and Framing',
  'Analytical problem solving',
  'Qualitative problem solving',
  'Synthesis and recommendation'
];

const sortCaseCriteria = (criteria: CriterionDefinition[]): CriterionDefinition[] => {
  const orderMap = new Map(CASE_CRITERIA_ORDER.map((title, index) => [title.toLowerCase(), index]));
  return [...criteria].sort((a, b) => {
    const aIndex = orderMap.get(a.title.toLowerCase()) ?? CASE_CRITERIA_ORDER.length;
    const bIndex = orderMap.get(b.title.toLowerCase()) ?? CASE_CRITERIA_ORDER.length;
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    return a.title.localeCompare(b.title);
  });
};

export const InterviewerScreen = () => {
  const { session } = useAuth();
  const { list: globalCaseCriteria } = useCaseCriteriaState();
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

  const buildCriteriaPayload = (values: Record<string, string>): EvaluationCriterionScore[] => {
    return Object.entries(values)
      .map(([criterionId, scoreValue]) => {
        if (!criterionId) {
          return null;
        }
        const trimmed = scoreValue.trim();
        if (!trimmed) {
          return { criterionId, score: undefined };
        }
        if (trimmed.toLowerCase() === 'n/a') {
          return { criterionId, score: undefined, notApplicable: true };
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed)
          ? ({ criterionId, score: parsed } as EvaluationCriterionScore)
          : { criterionId, score: undefined };
      })
      .filter((item): item is EvaluationCriterionScore => Boolean(item));
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
      const computedFitScore = computeAverageScore(formState.fitCriteria);
      const computedCaseScore = computeAverageScore(formState.caseCriteria);
      const existingFitScore =
        typeof selectedAssignment.form?.fitScore === 'number' && Number.isFinite(selectedAssignment.form?.fitScore)
          ? selectedAssignment.form?.fitScore
          : undefined;
      const existingCaseScore =
        typeof selectedAssignment.form?.caseScore === 'number' && Number.isFinite(selectedAssignment.form?.caseScore)
          ? selectedAssignment.form?.caseScore
          : undefined;

      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted,
        fitScore: computedFitScore ?? existingFitScore,
        caseScore: computedCaseScore ?? existingCaseScore,
        fitNotes: formState.fitNotes.trim() || undefined,
        caseNotes: formState.caseNotes.trim() || undefined,
        notes: formState.notes.trim() || undefined,
        interestNotes: formState.interestNotes.trim() || undefined,
        issuesToTest: formState.issuesToTest.trim() || undefined,
        offerRecommendation: formState.offerRecommendation || undefined,
        fitCriteria: buildCriteriaPayload(formState.fitCriteria),
        caseCriteria: buildCriteriaPayload(formState.caseCriteria)
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
            ? formatFirstLastName({
                firstName: assignment.candidate.firstName,
                lastName: assignment.candidate.lastName,
                fallback: 'Candidate not assigned'
              }).display
            : 'Candidate not assigned';
          const submitted = assignment.form?.submitted ?? false;
          const statusLabel = submitted ? 'Completed' : 'Assigned';
          const roundLabel = `Round ${assignment.roundNumber}`;
          return (
            <li
              key={assignment.slotId}
              className={`${styles.listItem} ${selectedSlot === assignment.slotId ? styles.listItemActive : ''}`}
              onClick={() => setSelectedSlot(assignment.slotId)}
            >
              <div className={styles.listItemTitle}>{candidateName}</div>
              <div className={styles.listItemMetaRow}>
                <span className={styles.roundBadge}>{roundLabel}</span>
                <span className={`${styles.statusPill} ${submitted ? styles.statusPillCompleted : styles.statusPillAssigned}`}>
                  {statusLabel}
                </span>
                <span className={styles.listItemMetaText}>Assigned {formatDate(assignment.invitationSentAt)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFiles = (folder: CaseFolder | undefined) => {
    if (!folder || folder.files.length === 0) {
      return <p className={styles.placeholderText}>No case files are attached.</p>;
    }
    return (
      <div className={styles.files}>
        {folder.files.map((file) => (
          <a key={file.id} href={file.dataUrl} download={file.fileName} className={styles.fileLink}>
            {file.fileName}
          </a>
        ))}
      </div>
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
      ? formatFirstLastName({
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          fallback: candidate.id
        }).display
      : 'Candidate not assigned';
    const fitQuestion = selectedAssignment.fitQuestion;
    const fitCriteria: CriterionDefinition[] = fitQuestion?.criteria ?? [];
    const mergedCaseCriteriaMap = new Map<string, CriterionDefinition>();

    (selectedAssignment.caseFolder?.evaluationCriteria ?? []).forEach((criterion) => {
      mergedCaseCriteriaMap.set(criterion.id, criterion);
    });

    globalCaseCriteria.forEach((criterion) => {
      mergedCaseCriteriaMap.set(criterion.id, {
        id: criterion.id,
        title: criterion.title,
        ratings: criterion.ratings
      });
    });

    const caseCriteria = sortCaseCriteria(Array.from(mergedCaseCriteriaMap.values()));
    const resumeLink = candidate?.resume ? (
      <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
        Download resume ({candidate.resume.fileName})
      </a>
    ) : (
      <p className={styles.placeholderText}>Resume is not available.</p>
    );
    const roundLabel = `Round ${selectedAssignment.roundNumber}`;
    const submittedAtLabel = selectedAssignment.form?.submittedAt
      ? formatDate(selectedAssignment.form?.submittedAt)
      : null;
    const storedFitScore =
      typeof selectedAssignment.form?.fitScore === 'number' && Number.isFinite(selectedAssignment.form?.fitScore)
        ? selectedAssignment.form?.fitScore
        : null;
    const storedCaseScore =
      typeof selectedAssignment.form?.caseScore === 'number' && Number.isFinite(selectedAssignment.form?.caseScore)
        ? selectedAssignment.form?.caseScore
        : null;
    const calculatedFitScore = computeAverageScore(formState.fitCriteria);
    const calculatedCaseScore = computeAverageScore(formState.caseCriteria);
    const displayFitScore = calculatedFitScore ?? storedFitScore;
    const displayCaseScore = calculatedCaseScore ?? storedCaseScore;
    const targetOffice = candidate?.targetOffice?.trim();
    const targetRole = candidate?.desiredPosition?.trim();

    const fitRatingsComplete = areRatingsComplete(fitCriteria, formState.fitCriteria);
    const caseRatingsComplete = areRatingsComplete(caseCriteria, formState.caseCriteria);
    const canSubmitFinal = fitRatingsComplete && caseRatingsComplete;

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <div className={styles.detailMeta}>
              <span className={styles.roundBadge}>{roundLabel}</span>
              {targetRole && <span className={styles.detailMetaItem}>Target role: {targetRole}</span>}
              {targetOffice && <span className={styles.detailMetaItem}>Target office: {targetOffice}</span>}
            </div>
          </div>
          <span
            className={`${styles.statusPill} ${isSubmitted ? styles.statusPillCompleted : styles.statusPillAssigned}`}
          >
            {isSubmitted ? 'Completed' : 'Assigned'}
          </span>
        </div>
        <div className={styles.detailColumns}>
          <aside className={styles.infoColumn}>
            <div className={styles.infoCard}>
              <h3>Candidate materials</h3>
              {resumeLink}
              {candidate?.targetPractice && <p>Practice: {candidate.targetPractice}</p>}
            </div>
            <div className={styles.infoCard}>
              <h3>Fit question</h3>
              {fitQuestion ? (
                <>
                  <p className={styles.fitQuestionTitle}>{fitQuestion.shortTitle}</p>
                  <p className={styles.fitQuestionContent}>{fitQuestion.content}</p>
                </>
              ) : (
                <p className={styles.placeholderText}>Fit question is not assigned.</p>
              )}
            </div>
            <div className={styles.infoCard}>
              <h3>Case resources</h3>
              {renderFiles(selectedAssignment.caseFolder)}
            </div>
          </aside>
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
                <header className={styles.sectionHeader}>
                  <h3>Behavioural interview</h3>
                </header>
                {fitCriteria.length ? (
                  <div className={styles.criteriaGrid}>
                    {fitCriteria.map((criterion) => (
                      <CriterionSelector
                        key={criterion.id}
                        criterion={criterion}
                        value={formState.fitCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        onChange={(next) =>
                          setFormState((prev) => ({
                            ...prev,
                            fitCriteria: { ...prev.fitCriteria, [criterion.id]: next }
                          }))
                        }
                      />
                    ))}
                    <div className={`${styles.criterionCard} ${styles.criterionSummary}`}>
                      <div className={styles.criterionHeaderRow}>
                        <span className={styles.criterionTitle}>Overall behavioural score</span>
                      </div>
                      <div className={styles.summaryScore}>{formatScoreValue(displayFitScore)}</div>
                      <p className={styles.summaryHint}>Average of selected ratings</p>
                    </div>
                  </div>
                ) : (
                  <p className={styles.placeholderText}>No behavioural criteria are configured.</p>
                )}
                <div className={styles.formRow}>
                  <label htmlFor="fitNotes">Behavioural Questions Notes</label>
                  <textarea
                    id="fitNotes"
                    rows={4}
                    value={formState.fitNotes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, fitNotes: event.target.value }))}
                    disabled={disableInputs}
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <header className={styles.sectionHeader}>
                  <h3>Case interview</h3>
                </header>
                {caseCriteria.length ? (
                  <div className={styles.criteriaGrid}>
                    {caseCriteria.map((criterion) => (
                      <CriterionSelector
                        key={criterion.id}
                        criterion={criterion}
                        value={formState.caseCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        onChange={(next) =>
                          setFormState((prev) => ({
                            ...prev,
                            caseCriteria: { ...prev.caseCriteria, [criterion.id]: next }
                          }))
                        }
                      />
                    ))}
                    <div className={`${styles.criterionCard} ${styles.criterionSummary}`}>
                      <div className={styles.criterionHeaderRow}>
                        <span className={styles.criterionTitle}>Overall case score</span>
                      </div>
                      <div className={styles.summaryScore}>{formatScoreValue(displayCaseScore)}</div>
                      <p className={styles.summaryHint}>Average of selected ratings</p>
                    </div>
                  </div>
                ) : (
                  <p className={styles.placeholderText}>No case criteria are configured for this folder.</p>
                )}
                <div className={styles.formRow}>
                  <label htmlFor="caseNotes">Case notes</label>
                  <textarea
                    id="caseNotes"
                    rows={4}
                    value={formState.caseNotes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, caseNotes: event.target.value }))}
                    disabled={disableInputs}
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <header className={styles.sectionHeader}>
                  <h3>Interest level</h3>
                </header>
                <div className={styles.formRow}>
                  <textarea
                    id="interestNotes"
                    aria-label="Interest level notes"
                    placeholder="Add notes about the candidate's interest level"
                    rows={3}
                    value={formState.interestNotes}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, interestNotes: event.target.value }))
                    }
                    disabled={disableInputs}
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <header className={styles.sectionHeader}>
                  <h3>Issues to Test in Next Interview</h3>
                </header>
                <div className={styles.formRow}>
                  <textarea
                    id="issuesToTest"
                    aria-label="Issues to Test in Next Interview"
                    placeholder="List focus areas for the next interviewer"
                    rows={3}
                    value={formState.issuesToTest}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, issuesToTest: event.target.value }))
                    }
                    disabled={disableInputs}
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <header className={styles.sectionHeader}>
                  <h3>Summary & recommendation</h3>
                </header>
                <div className={styles.offerGroup}>
                  {OFFER_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.offerOption}>
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
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="generalNotes">Comments (optional)</label>
                  <textarea
                    id="generalNotes"
                    rows={4}
                    value={formState.notes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                    disabled={disableInputs}
                  />
                </div>
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
              disabled={isSubmitted || saving || !canSubmitFinal}
              onClick={() => {
                if (!canSubmitFinal) {
                  setBanner({
                    type: 'error',
                    text: 'Complete all quantitative ratings before submitting the evaluation.'
                  });
                  return;
                }
                handleSubmitFinal();
              }}
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
