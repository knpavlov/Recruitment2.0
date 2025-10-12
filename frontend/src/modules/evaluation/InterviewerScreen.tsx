import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import { InterviewerAssignmentView } from '../../shared/types/evaluation';
import { CaseFolder } from '../../shared/types/caseLibrary';
import { ApiError } from '../../shared/api/httpClient';

interface Banner {
  type: 'info' | 'error';
  text: string;
}

interface FormState {
  submitted: boolean;
  fitScore: string;
  caseScore: string;
  fitNotes: string;
  caseNotes: string;
  notes: string;
}

const createFormState = (assignment: InterviewerAssignmentView | null): FormState => {
  if (!assignment?.form) {
    return {
      submitted: false,
      fitScore: '',
      caseScore: '',
      fitNotes: '',
      caseNotes: '',
      notes: ''
    };
  }
  return {
    submitted: assignment.form.submitted,
    fitScore: assignment.form.fitScore ? String(assignment.form.fitScore) : '',
    caseScore: assignment.form.caseScore ? String(assignment.form.caseScore) : '',
    fitNotes: assignment.form.fitNotes ?? '',
    caseNotes: assignment.form.caseNotes ?? '',
    notes: assignment.form.notes ?? ''
  };
};

const formatDateTime = (value: string | undefined) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
};

const toNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const InterviewerScreen = () => {
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<InterviewerAssignmentView[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(createFormState(null));
  const [initialSlotConsumed, setInitialSlotConsumed] = useState(false);
  const [initialSlot] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('slot');
  });

  const selectedAssignment = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    return assignments.find((item) => item.slotId === selectedSlot) ?? null;
  }, [assignments, selectedSlot]);

  const isReadOnly = selectedAssignment?.form?.submitted ?? formState.submitted;

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
        if (!initialSlotConsumed) {
          let nextSlot: string | null = null;
          if (initialSlot && items.some((item) => item.slotId === initialSlot)) {
            nextSlot = initialSlot;
          } else if (selectedSlot && items.some((item) => item.slotId === selectedSlot)) {
            nextSlot = selectedSlot;
          } else if (items.length) {
            nextSlot = items[0].slotId;
          }
          setSelectedSlot(nextSlot);
          setInitialSlotConsumed(true);
        } else if (selectedSlot) {
          const exists = items.some((item) => item.slotId === selectedSlot);
          if (!exists) {
            setSelectedSlot(items[0]?.slotId ?? null);
          }
        } else if (items.length) {
          setSelectedSlot(items[0].slotId);
        }
      } catch (error) {
        console.error('Failed to load interviewer assignments:', error);
        setBanner({ type: 'error', text: 'Unable to load assignments. Please try again later.' });
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

  const persistForm = async (submitted: boolean, successMessage: string) => {
    if (!session?.email || !selectedAssignment) {
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted,
        fitScore: toNumber(formState.fitScore),
        caseScore: toNumber(formState.caseScore),
        fitNotes: formState.fitNotes.trim() || undefined,
        caseNotes: formState.caseNotes.trim() || undefined,
        notes: formState.notes.trim() || undefined
      });
      setFormState((prev) => ({ ...prev, submitted }));
      await refreshAssignments();
      setBanner({ type: 'info', text: successMessage });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'access-denied') {
          setBanner({ type: 'error', text: 'You are not allowed to edit this interview.' });
        } else if (error.code === 'form-locked') {
          setBanner({ type: 'error', text: 'This review was already submitted and cannot be changed.' });
        } else if (error.code === 'invalid-input') {
          setBanner({ type: 'error', text: 'Please double-check your scores and try again.' });
        } else {
          setBanner({ type: 'error', text: 'We could not save your review. Try again later.' });
        }
      } else {
        console.error('Failed to submit interview form:', error);
        setBanner({ type: 'error', text: 'We could not save your review. Try again later.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (event: FormEvent) => {
    event.preventDefault();
    await persistForm(false, 'Draft saved. You can return anytime to complete it.');
  };

  const handleSubmitReview = async () => {
    if (isReadOnly) {
      return;
    }
    await persistForm(true, 'Review submitted. Thank you for your time!');
  };

  const renderFiles = (folder: CaseFolder | undefined) => {
    if (!folder || folder.files.length === 0) {
      return <p>No case files uploaded.</p>;
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

  const renderList = () => {
    if (loading) {
      return <p>Loading assignments…</p>;
    }
    if (assignments.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2>No assignments yet</h2>
          <p>You will see interview invitations here as soon as an administrator assigns them.</p>
        </div>
      );
    }
    return (
      <ul className={styles.list}>
        {assignments.map((assignment) => {
          const candidateName = assignment.candidate
            ? `${assignment.candidate.lastName} ${assignment.candidate.firstName}`.trim()
            : 'Candidate not selected';
          const submitted = assignment.form?.submitted ?? false;
          const statusLabel = submitted ? 'Review submitted' : 'Awaiting review';
          return (
            <li
              key={assignment.slotId}
              className={`${styles.listItem} ${selectedSlot === assignment.slotId ? styles.listItemActive : ''}`}
              onClick={() => setSelectedSlot(assignment.slotId)}
            >
              <div className={styles.listItemTitle}>{candidateName}</div>
              <p className={styles.listItemMeta}>
                {statusLabel} · Assigned {formatDateTime(assignment.invitationSentAt)}
              </p>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderDetail = () => {
    if (!selectedAssignment) {
      return (
        <div className={styles.emptyState}>
          <h2>Select an interview</h2>
          <p>Pick an interview from the list on the left to access candidate materials and the review form.</p>
        </div>
      );
    }
    const candidate = selectedAssignment.candidate;
    const candidateName = candidate
      ? `${candidate.lastName} ${candidate.firstName}`.trim() || candidate.id
      : 'Candidate not selected';
    const resumeLink = candidate?.resume ? (
      <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
        Download resume ({candidate.resume.fileName})
      </a>
    ) : (
      <p>Resume not available.</p>
    );
    const fitQuestion = selectedAssignment.fitQuestion;
    const disableInputs = saving || isReadOnly;

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <p className={styles.detailMeta}>Assigned {formatDateTime(selectedAssignment.invitationSentAt)}</p>
          </div>
          <span className={`${styles.badge} ${isReadOnly ? styles.badgeSuccess : ''}`}>
            {isReadOnly ? 'Submitted' : 'In progress'}
          </span>
        </div>

        <div className={styles.detailBody}>
          <aside className={styles.detailSidebar}>
            <div className={styles.section}>
              <h3>Candidate materials</h3>
              <p>Last updated {formatDateTime(selectedAssignment.evaluationUpdatedAt)}</p>
              {resumeLink}
              {candidate?.desiredPosition && <p>Target role: {candidate.desiredPosition}</p>}
            </div>

            <div className={styles.section}>
              <h3>Case</h3>
              {renderFiles(selectedAssignment.caseFolder)}
            </div>

            <div className={styles.section}>
              <h3>Fit question</h3>
              {fitQuestion ? (
                <>
                  <p className={styles.fitTitle}>{fitQuestion.shortTitle}</p>
                  <p>{fitQuestion.content}</p>
                </>
              ) : (
                <p>No fit question assigned.</p>
              )}
            </div>
          </aside>

          <form className={styles.form} onSubmit={handleSaveDraft}>
            <div className={styles.formRow}>
              <label htmlFor="fitScore">Fit score (1-5)</label>
              <select
                id="fitScore"
                value={formState.fitScore}
                onChange={(event) => setFormState((prev) => ({ ...prev, fitScore: event.target.value }))}
                disabled={disableInputs}
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <label htmlFor="fitNotes">Fit feedback</label>
              <textarea
                id="fitNotes"
                rows={3}
                value={formState.fitNotes}
                onChange={(event) => setFormState((prev) => ({ ...prev, fitNotes: event.target.value }))}
                disabled={disableInputs}
              />
            </div>

            <div className={styles.formRow}>
              <label htmlFor="caseScore">Case score (1-5)</label>
              <select
                id="caseScore"
                value={formState.caseScore}
                onChange={(event) => setFormState((prev) => ({ ...prev, caseScore: event.target.value }))}
                disabled={disableInputs}
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <label htmlFor="caseNotes">Case feedback</label>
              <textarea
                id="caseNotes"
                rows={3}
                value={formState.caseNotes}
                onChange={(event) => setFormState((prev) => ({ ...prev, caseNotes: event.target.value }))}
                disabled={disableInputs}
              />
            </div>

            <div className={styles.formRow}>
              <label htmlFor="generalNotes">General notes</label>
              <textarea
                id="generalNotes"
                rows={4}
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                disabled={disableInputs}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton} disabled={disableInputs}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={disableInputs || isReadOnly}
                onClick={handleSubmitReview}
              >
                {isReadOnly ? 'Already submitted' : 'Submit review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <header>
        <h1>My interviews</h1>
        <p>All candidates assigned to you appear below. Open any card to review their materials.</p>
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
