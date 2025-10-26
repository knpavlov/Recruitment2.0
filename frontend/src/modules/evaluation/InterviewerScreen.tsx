import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import {
  EvaluationCriterionScore,
  EvaluationDecision,
  InterviewStatusRecord,
  InterviewerAssignmentView,
  OfferRecommendationValue,
  PeerInterviewFormView
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

const buildFormStateFromRecord = (record: InterviewStatusRecord | null | undefined): FormState => {
  if (!record) {
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
    fitNotes: record.fitNotes ?? '',
    caseNotes: record.caseNotes ?? '',
    notes: record.notes ?? '',
    interestNotes: record.interestNotes ?? '',
    issuesToTest: record.issuesToTest ?? '',
    offerRecommendation: record.offerRecommendation ?? '',
    fitCriteria: toCriteriaMap(record.fitCriteria),
    caseCriteria: toCriteriaMap(record.caseCriteria)
  };
};

const createFormState = (assignment: InterviewerAssignmentView | null): FormState =>
  buildFormStateFromRecord(assignment?.form ?? null);

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

type OutcomeTone = 'pending' | 'positive' | 'progress' | 'negative';

const resolveOutcomeDisplay = (decision: EvaluationDecision | null | undefined): {
  label: string;
  tone: OutcomeTone;
} => {
  if (decision === 'offer' || decision === 'accepted-offer') {
    return { label: 'Offer', tone: 'positive' };
  }
  if (decision === 'progress') {
    return { label: 'Progress to next round', tone: 'progress' };
  }
  if (decision === 'reject') {
    return { label: 'Reject', tone: 'negative' };
  }
  return { label: 'Outcome pending', tone: 'pending' };
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
  const [activePeerSlotId, setActivePeerSlotId] = useState<string | null>(null);
  const [draftStates, setDraftStates] = useState<Record<string, FormState>>({});
  const draftStatesRef = useRef<Record<string, FormState>>({});

  const selectedAssignment = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    return assignments.find((item) => item.slotId === selectedSlot) ?? null;
  }, [assignments, selectedSlot]);

  useEffect(() => {
    draftStatesRef.current = draftStates;
  }, [draftStates]);

  useEffect(() => {
    if (!selectedAssignment) {
      setActivePeerSlotId(null);
      setFormState(createFormState(null));
      return;
    }
    setActivePeerSlotId((prev) => {
      if (prev && selectedAssignment.peerForms.some((peer) => peer.slotId === prev)) {
        return prev;
      }
      return selectedAssignment.slotId;
    });
    const existingDraft = draftStatesRef.current[selectedAssignment.slotId];
    if (existingDraft) {
      setFormState(existingDraft);
      return;
    }
    const nextState = createFormState(selectedAssignment);
    setFormState(nextState);
    setDraftStates((prev) => ({ ...prev, [selectedAssignment.slotId]: nextState }));
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

  const updateLocalFormState = (updater: (prev: FormState) => FormState) => {
    if (!selectedAssignment) {
      return;
    }
    setFormState((prev) => {
      const next = updater(prev);
      setDraftStates((map) => ({ ...map, [selectedAssignment.slotId]: next }));
      return next;
    });
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
      if (submitted) {
        setDraftStates((prev) => {
          const next = { ...prev };
          delete next[selectedAssignment.slotId];
          return next;
        });
      }
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
    if (!selectedAssignment) {
      return;
    }
    if (activePeerSlotId && activePeerSlotId !== selectedAssignment.slotId) {
      return;
    }
    void persistForm({ submitted: false });
  };

  const handleSubmitFinal = () => {
    if (!selectedAssignment) {
      return;
    }
    if (activePeerSlotId && activePeerSlotId !== selectedAssignment.slotId) {
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
          const outcomeDisplay = resolveOutcomeDisplay(assignment.decision ?? null);
          const outcomeToneClass =
            outcomeDisplay.tone === 'positive'
              ? styles.outcomePillPositive
              : outcomeDisplay.tone === 'progress'
                ? styles.outcomePillProgress
                : outcomeDisplay.tone === 'negative'
                  ? styles.outcomePillNegative
                  : styles.outcomePillPending;
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
                <span className={`${styles.outcomePill} ${outcomeToneClass}`}>{outcomeDisplay.label}</span>
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

    const peerForms: PeerInterviewFormView[] = selectedAssignment.peerForms.length
      ? selectedAssignment.peerForms
      : [
          {
            slotId: selectedAssignment.slotId,
            interviewerName: selectedAssignment.interviewerName,
            interviewerEmail: selectedAssignment.interviewerEmail,
            submitted: selectedAssignment.form?.submitted ?? false,
            submittedAt: selectedAssignment.form?.submittedAt,
            form: selectedAssignment.form?.submitted ? selectedAssignment.form : null
          }
        ];

    const activeSlotId =
      activePeerSlotId && peerForms.some((peer) => peer.slotId === activePeerSlotId)
        ? activePeerSlotId
        : selectedAssignment.slotId;
    const activePeer = peerForms.find((peer) => peer.slotId === activeSlotId) ?? null;
    const isOwnTab = activeSlotId === selectedAssignment.slotId;
    const isSubmitted = isOwnTab
      ? selectedAssignment.form?.submitted ?? false
      : activePeer?.submitted ?? false;
    const disableInputs = saving || isSubmitted || !isOwnTab;
    const displayFormState = isOwnTab ? formState : buildFormStateFromRecord(activePeer?.form);

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
    const submittedAtLabel = isOwnTab
      ? selectedAssignment.form?.submittedAt
        ? formatDate(selectedAssignment.form?.submittedAt)
        : null
      : activePeer?.submittedAt
        ? formatDate(activePeer.submittedAt)
        : null;
    const storedFitScoreValue = isOwnTab ? selectedAssignment.form?.fitScore : activePeer?.form?.fitScore;
    const storedCaseScoreValue = isOwnTab ? selectedAssignment.form?.caseScore : activePeer?.form?.caseScore;
    const storedFitScore =
      typeof storedFitScoreValue === 'number' && Number.isFinite(storedFitScoreValue)
        ? storedFitScoreValue
        : null;
    const storedCaseScore =
      typeof storedCaseScoreValue === 'number' && Number.isFinite(storedCaseScoreValue)
        ? storedCaseScoreValue
        : null;
    const calculatedFitScore = computeAverageScore(displayFormState.fitCriteria);
    const calculatedCaseScore = computeAverageScore(displayFormState.caseCriteria);
    const displayFitScore = calculatedFitScore ?? storedFitScore;
    const displayCaseScore = calculatedCaseScore ?? storedCaseScore;
    const targetOffice = candidate?.targetOffice?.trim();
    const targetRole = candidate?.desiredPosition?.trim();

    const fitRatingsComplete = isOwnTab ? areRatingsComplete(fitCriteria, formState.fitCriteria) : true;
    const caseRatingsComplete = isOwnTab ? areRatingsComplete(caseCriteria, formState.caseCriteria) : true;
    const canSubmitFinal = isOwnTab && fitRatingsComplete && caseRatingsComplete;

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
          <span className={`${styles.statusPill} ${isSubmitted ? styles.statusPillCompleted : styles.statusPillAssigned}`}>
            {isSubmitted ? 'Completed' : 'Assigned'}
          </span>
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="Interviewer forms">
          {peerForms.map((peer) => {
            const isActive = peer.slotId === activeSlotId;
            const isSelf = peer.slotId === selectedAssignment.slotId;
            const disabled = !isSelf && !peer.submitted;
            const tabClassName = [
              styles.tabButton,
              isActive ? styles.tabButtonActive : '',
              disabled ? styles.tabButtonDisabled : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={peer.slotId}
                type="button"
                className={tabClassName}
                role="tab"
                aria-selected={isActive}
                aria-controls={`interview-form-${peer.slotId}`}
                disabled={disabled}
                onClick={() => setActivePeerSlotId(peer.slotId)}
              >
                {peer.interviewerName || 'Interviewer'}
              </button>
            );
          })}
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
              id={`interview-form-${activeSlotId}`}
              onSubmit={(event) => {
                event.preventDefault();
                if (!isOwnTab) {
                  return;
                }
                handleSaveDraft();
              }}
            >
              {!isOwnTab && (
                <div className={styles.formNotice}>
                  Viewing {activePeer?.interviewerName || 'interviewer'}'s submitted evaluation. Editing is disabled.
                </div>
              )}
              {isOwnTab && isSubmitted && (
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
                        value={displayFormState.fitCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        highlightSelection={isSubmitted}
                        onChange={(next) => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateLocalFormState((prev) => ({
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
                    value={displayFormState.fitNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const nextValue = event.target.value;
                      updateLocalFormState((prev) => ({ ...prev, fitNotes: nextValue }));
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
                        value={displayFormState.caseCriteria[criterion.id] ?? ''}
                        disabled={disableInputs}
                        highlightSelection={isSubmitted}
                        onChange={(next) => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateLocalFormState((prev) => ({
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
                    value={displayFormState.caseNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const nextValue = event.target.value;
                      updateLocalFormState((prev) => ({ ...prev, caseNotes: nextValue }));
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
                    value={displayFormState.interestNotes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const nextValue = event.target.value;
                      updateLocalFormState((prev) => ({ ...prev, interestNotes: nextValue }));
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
                    value={displayFormState.issuesToTest}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const nextValue = event.target.value;
                      updateLocalFormState((prev) => ({ ...prev, issuesToTest: nextValue }));
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
                        checked={displayFormState.offerRecommendation === option.value}
                        disabled={disableInputs}
                        onChange={() => {
                          if (!isOwnTab) {
                            return;
                          }
                          updateLocalFormState((prev) => ({ ...prev, offerRecommendation: option.value }));
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
                    value={displayFormState.notes}
                    onChange={(event) => {
                      if (!isOwnTab) {
                        return;
                      }
                      const nextValue = event.target.value;
                      updateLocalFormState((prev) => ({ ...prev, notes: nextValue }));
                    }}
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
                  disabled={!isOwnTab || isSubmitted || saving || !canSubmitFinal}
                  onClick={() => {
                    if (!isOwnTab) {
                      return;
                    }
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
