import { Fragment, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import {
  InterviewerAssignmentView,
  OfferRecommendationValue,
  EvaluationCriterionScore,
  InterviewStatusRecord
} from '../../shared/types/evaluation';
import { CaseFolder } from '../../shared/types/caseLibrary';
import { ApiError } from '../../shared/api/httpClient';
import { useCaseCriteriaState } from '../../app/state/AppStateContext';
import { formatDate } from '../../shared/utils/date';
import { composeFullName } from '../../shared/utils/personName';

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

type FormTab = {
  slotId: string;
  interviewerName: string;
  submitted: boolean;
  form: InterviewStatusRecord | null;
  isSelf: boolean;
};

interface CriterionSelectorProps {
  criterion: CriterionDefinition;
  value: string;
  disabled: boolean;
  highlightSelection: boolean;
  onChange: (next: CriterionScoreValue) => void;
}

const CriterionSelector = ({
  criterion,
  value,
  disabled,
  highlightSelection,
  onChange
}: CriterionSelectorProps) => {
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
          <label
            key={score}
            className={[
              styles.criterionOption,
              value === score ? styles.criterionOptionActive : '',
              disabled ? styles.criterionOptionDisabled : '',
              value === score && highlightSelection ? styles.criterionOptionSubmitted : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
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

const createEmptyCriteria = (): Record<string, string> => ({});

const toCriteriaMap = (entries: EvaluationCriterionScore[] | undefined): Record<string, string> => {
  if (!entries) {
    return createEmptyCriteria();
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

const createFormStateFromForm = (form: InterviewStatusRecord | null): FormState => {
  if (!form) {
    return {
      fitNotes: '',
      caseNotes: '',
      notes: '',
      interestNotes: '',
      issuesToTest: '',
      offerRecommendation: '',
      fitCriteria: createEmptyCriteria(),
      caseCriteria: createEmptyCriteria()
    };
  }
  return {
    fitNotes: form.fitNotes ?? '',
    caseNotes: form.caseNotes ?? '',
    notes: form.notes ?? '',
    interestNotes: form.interestNotes ?? '',
    issuesToTest: form.issuesToTest ?? '',
    offerRecommendation: form.offerRecommendation ?? '',
    fitCriteria: toCriteriaMap(form.fitCriteria),
    caseCriteria: toCriteriaMap(form.caseCriteria)
  };
};

const createFormState = (assignment: InterviewerAssignmentView | null): FormState =>
  createFormStateFromForm(assignment?.form ?? null);

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

type OutcomeKind = 'offer' | 'progress' | 'reject' | 'pending';

const resolveOutcomeMeta = (
  decision: InterviewerAssignmentView['decision']
): { kind: OutcomeKind; label: string } => {
  switch (decision) {
    case 'offer':
    case 'accepted-offer':
      return { kind: 'offer', label: 'Offer' };
    case 'progress':
      return { kind: 'progress', label: 'Progress to next round' };
    case 'reject':
      return { kind: 'reject', label: 'Reject' };
    default:
      return { kind: 'pending', label: 'Outcome pending' };
  }
};

const outcomeClassMap: Record<OutcomeKind, string> = {
  offer: styles.outcomeTagOffer,
  progress: styles.outcomeTagProgress,
  reject: styles.outcomeTagReject,
  pending: styles.outcomeTagPending
};

export const InterviewerScreen = () => {
  const { session } = useAuth();
  const { list: globalCaseCriteria } = useCaseCriteriaState();
  const [assignments, setAssignments] = useState<InterviewerAssignmentView[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formStates, setFormStates] = useState<Record<string, FormState>>({});
  const [activeFormSlotId, setActiveFormSlotId] = useState<string | null>(null);

  const selectedAssignment = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    return assignments.find((item) => item.slotId === selectedSlot) ?? null;
  }, [assignments, selectedSlot]);

  const formTabs = useMemo<FormTab[]>(() => {
    if (!selectedAssignment) {
      return [];
    }
    const tabs: FormTab[] = [
      {
        slotId: selectedAssignment.slotId,
        interviewerName: selectedAssignment.interviewerName || 'Interviewer',
        submitted: selectedAssignment.form?.submitted ?? false,
        form: selectedAssignment.form,
        isSelf: true
      }
    ];
    for (const peer of selectedAssignment.peerForms ?? []) {
      if (!peer || peer.slotId === selectedAssignment.slotId) {
        continue;
      }
      tabs.push({
        slotId: peer.slotId,
        interviewerName: peer.interviewerName || 'Interviewer',
        submitted: peer.submitted,
        form: peer.form,
        isSelf: false
      });
    }
    return tabs;
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedAssignment) {
      setActiveFormSlotId(null);
      return;
    }
    setFormStates((prev) => {
      const existing = prev[selectedAssignment.slotId];
      const nextFromServer = createFormState(selectedAssignment);
      if (!existing || selectedAssignment.form?.submitted) {
        return { ...prev, [selectedAssignment.slotId]: nextFromServer };
      }
      return prev;
    });
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedAssignment) {
      setActiveFormSlotId(null);
      return;
    }
    setActiveFormSlotId((prev) => {
      if (prev && formTabs.some((tab) => tab.slotId === prev && (tab.isSelf || tab.submitted))) {
        return prev;
      }
      return selectedAssignment.slotId;
    });
  }, [selectedAssignment, formTabs]);

  const editableFormState = useMemo(() => {
    if (!selectedAssignment) {
      return createFormState(null);
    }
    return formStates[selectedAssignment.slotId] ?? createFormState(selectedAssignment);
  }, [formStates, selectedAssignment]);

  const activeFormTab = useMemo(() => {
    if (!formTabs.length) {
      return null;
    }
    const current = formTabs.find((tab) => tab.slotId === activeFormSlotId);
    return current ?? formTabs[0];
  }, [activeFormSlotId, formTabs]);

  const isOwnTab = Boolean(activeFormTab && selectedAssignment && activeFormTab.slotId === selectedAssignment.slotId);
  const activeFormState = isOwnTab
    ? editableFormState
    : createFormStateFromForm(activeFormTab?.form ?? null);
  const ownFormSubmitted = selectedAssignment?.form?.submitted ?? false;
  const activeFormSubmitted = activeFormTab?.submitted ?? false;
  const disableInputs = saving || ownFormSubmitted || !isOwnTab;

  const updateEditableFormState = (updater: (current: FormState) => FormState) => {
    if (!selectedAssignment || !isOwnTab) {
      return;
    }
    setFormStates((prev) => {
      const current = prev[selectedAssignment.slotId] ?? createFormState(selectedAssignment);
      const next = updater(current);
      if (next === current) {
        return prev;
      }
      return { ...prev, [selectedAssignment.slotId]: next };
    });
  };

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
      const computedFitScore = computeAverageScore(editableFormState.fitCriteria);
      const computedCaseScore = computeAverageScore(editableFormState.caseCriteria);
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
        fitNotes: editableFormState.fitNotes.trim() || undefined,
        caseNotes: editableFormState.caseNotes.trim() || undefined,
        notes: editableFormState.notes.trim() || undefined,
        interestNotes: editableFormState.interestNotes.trim() || undefined,
        issuesToTest: editableFormState.issuesToTest.trim() || undefined,
        offerRecommendation: editableFormState.offerRecommendation || undefined,
        fitCriteria: buildCriteriaPayload(editableFormState.fitCriteria),
        caseCriteria: buildCriteriaPayload(editableFormState.caseCriteria)
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
    if (!isOwnTab) {
      return;
    }
    void persistForm({ submitted: false });
  };

  const handleSubmitFinal = () => {
    if (!isOwnTab) {
      return;
    }
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
            ? composeFullName(assignment.candidate.firstName, assignment.candidate.lastName) ||
              'Candidate not assigned'
            : 'Candidate not assigned';
          const submitted = assignment.form?.submitted ?? false;
          const statusLabel = submitted ? 'Completed' : 'Assigned';
          const roundLabel = `Round ${assignment.roundNumber}`;
          const outcomeMeta = resolveOutcomeMeta(assignment.decision ?? null);
          const outcomeClass = outcomeClassMap[outcomeMeta.kind];
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
                <span className={`${styles.outcomeTag} ${outcomeClass}`}>{outcomeMeta.label}</span>
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
      ? composeFullName(candidate.firstName, candidate.lastName) || candidate.id
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
    const storedForm = isOwnTab ? selectedAssignment.form : activeFormTab?.form ?? null;
    const storedFitScore =
      typeof storedForm?.fitScore === 'number' && Number.isFinite(storedForm?.fitScore) ? storedForm?.fitScore : null;
    const storedCaseScore =
      typeof storedForm?.caseScore === 'number' && Number.isFinite(storedForm?.caseScore) ? storedForm?.caseScore : null;
    const calculatedFitScore = computeAverageScore(activeFormState.fitCriteria);
    const calculatedCaseScore = computeAverageScore(activeFormState.caseCriteria);
    const displayFitScore = calculatedFitScore ?? storedFitScore;
    const displayCaseScore = calculatedCaseScore ?? storedCaseScore;
    const targetOffice = candidate?.targetOffice?.trim();
    const targetRole = candidate?.desiredPosition?.trim();

    const fitRatingsComplete = areRatingsComplete(fitCriteria, editableFormState.fitCriteria);
    const caseRatingsComplete = areRatingsComplete(caseCriteria, editableFormState.caseCriteria);
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
            className={`${styles.statusPill} ${ownFormSubmitted ? styles.statusPillCompleted : styles.statusPillAssigned}`}
          >
            {ownFormSubmitted ? 'Completed' : 'Assigned'}
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
            {formTabs.length > 0 && (
              <div className={styles.formTabs} role="tablist" aria-label="Interviewer evaluations">
                {formTabs.map((tab) => {
                  const isActive = activeFormTab?.slotId === tab.slotId;
                  const isDisabled = !tab.isSelf && !tab.submitted;
                  return (
                    <button
                      key={tab.slotId}
                      type="button"
                      className={[
                        styles.formTab,
                        isActive ? styles.formTabActive : '',
                        isDisabled ? styles.formTabDisabled : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (isDisabled) {
                          return;
                        }
                        setActiveFormSlotId(tab.slotId);
                      }}
                      disabled={isDisabled}
                      aria-selected={isActive}
                    >
                      <span>{tab.interviewerName}</span>
                      {!tab.isSelf && !tab.submitted && <span className={styles.formTabBadge}>Pending</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveDraft();
              }}
            >
              {!isOwnTab && (
                <div className={styles.formNotice}>
                  Viewing submission from {activeFormTab?.interviewerName}. Editing is disabled.
                </div>
              )}
              {ownFormSubmitted && (
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
                        value={activeFormState.fitCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        highlightSelection={activeFormSubmitted}
                        onChange={(next) => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateEditableFormState((prev) => ({
                            ...prev,
                            fitCriteria: { ...prev.fitCriteria, [criterion.id]: next }
                          }));
                        }}
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
                    value={activeFormState.fitNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const value = event.target.value;
                      updateEditableFormState((prev) => ({ ...prev, fitNotes: value }));
                    }}
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
                        value={activeFormState.caseCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        highlightSelection={activeFormSubmitted}
                        onChange={(next) => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateEditableFormState((prev) => ({
                            ...prev,
                            caseCriteria: { ...prev.caseCriteria, [criterion.id]: next }
                          }));
                        }}
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
                    value={activeFormState.caseNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const value = event.target.value;
                      updateEditableFormState((prev) => ({ ...prev, caseNotes: value }));
                    }}
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
                    value={activeFormState.interestNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const value = event.target.value;
                      updateEditableFormState((prev) => ({ ...prev, interestNotes: value }));
                    }}
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
                    value={activeFormState.issuesToTest}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const value = event.target.value;
                      updateEditableFormState((prev) => ({ ...prev, issuesToTest: value }));
                    }}
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
                        checked={activeFormState.offerRecommendation === option.value}
                        disabled={disableInputs}
                        onChange={() => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateEditableFormState((prev) => ({ ...prev, offerRecommendation: option.value }));
                        }}
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
                    value={activeFormState.notes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const value = event.target.value;
                      updateEditableFormState((prev) => ({ ...prev, notes: value }));
                    }}
                    disabled={disableInputs}
                  />
                </div>
              </section>

              {isOwnTab && (
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
                    disabled={ownFormSubmitted || saving || !canSubmitFinal}
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
              )}
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
