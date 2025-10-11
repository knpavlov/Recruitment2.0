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
  fitScore: string;
  caseScore: string;
  fitNotes: string;
  caseNotes: string;
  notes: string;
}

const createFormState = (assignment: InterviewerAssignmentView | null): FormState => {
  if (!assignment?.form) {
    return {
      fitScore: '',
      caseScore: '',
      fitNotes: '',
      caseNotes: '',
      notes: ''
    };
  }
  return {
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
    return new Date(value).toLocaleString('en-GB', {
      hour12: false,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  const [pendingAction, setPendingAction] = useState<'save' | 'submit' | null>(null);
  const [formState, setFormState] = useState<FormState>(createFormState(null));

  const selectedAssignment = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    return assignments.find((item) => item.slotId === selectedSlot) ?? null;
  }, [assignments, selectedSlot]);

  const isLocked = selectedAssignment?.form?.submitted ?? false;

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
        setBanner({
          type: 'error',
          text: 'Could not load assignments. Refresh the page or try again later.'
        });
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

  const persistForm = async (mode: 'save' | 'submit') => {
    if (!session?.email || !selectedAssignment) {
      return;
    }
    setSaving(true);
    setPendingAction(mode);
    setBanner(null);
    try {
      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted: mode === 'submit',
        fitScore: formState.fitScore ? Number(formState.fitScore) : undefined,
        caseScore: formState.caseScore ? Number(formState.caseScore) : undefined,
        fitNotes: formState.fitNotes.trim() || undefined,
        caseNotes: formState.caseNotes.trim() || undefined,
        notes: formState.notes.trim() || undefined
      });
      await refreshAssignments();
      setBanner({
        type: 'info',
        text:
          mode === 'submit'
            ? 'Feedback submitted. Thank you!'
            : 'Progress saved. You can return to the form at any time.'
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'access-denied') {
        setBanner({ type: 'error', text: 'You are not allowed to access this interview.' });
      } else if (error instanceof ApiError && error.code === 'form-locked') {
        setBanner({ type: 'error', text: 'This form has already been submitted.' });
      } else if (error instanceof ApiError && error.code === 'version-conflict') {
        setBanner({ type: 'error', text: 'Data changed in the meantime. Refresh the page and try again.' });
      } else {
        console.error('Failed to submit interview form:', error);
        setBanner({ type: 'error', text: 'Failed to save the form. Please try again.' });
      }
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    void persistForm('save');
  };

  const handleSubmitFinal = () => {
    void persistForm('submit');
  };

  const renderList = () => {
    if (loading) {
      return <p>Loading assignments…</p>;
    }
    if (assignments.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2>No interviews yet</h2>
          <p>You will see assigned candidates here once the coordinator sends you an invitation.</p>
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
          return (
            <li
              key={assignment.slotId}
              className={`${styles.listItem} ${selectedSlot === assignment.slotId ? styles.listItemActive : ''}`}
              onClick={() => setSelectedSlot(assignment.slotId)}
            >
              <div className={styles.listItemTitle}>{candidateName}</div>
              <p className={styles.listItemMeta}>
                {submitted ? 'Submitted' : 'Awaiting feedback'} · Assigned {formatDateTime(assignment.invitationSentAt)}
              </p>
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
          <p>Pick a candidate on the left to review the materials and fill in the feedback form.</p>
        </div>
      );
    }
    const candidate = selectedAssignment.candidate;
    const candidateName = candidate
      ? `${candidate.lastName} ${candidate.firstName}`.trim() || candidate.id
      : 'Candidate not selected';
    const submitted = isLocked;
    const fitQuestion = selectedAssignment.fitQuestion;
    const resumeLink = candidate?.resume ? (
      <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
        Download résumé ({candidate.resume.fileName})
      </a>
    ) : (
      <p>Résumé is not available.</p>
    );
    const disableInputs = saving || submitted;
    const saveLabel = pendingAction === 'save' ? 'Saving…' : 'Save progress';
    const submitLabel = pendingAction === 'submit' ? 'Submitting…' : 'Submit feedback';
    const lastUpdated = formatDateTime(selectedAssignment.evaluationUpdatedAt);

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <p>
              Assigned {formatDateTime(selectedAssignment.invitationSentAt)} · Last updated {lastUpdated}
            </p>
          </div>
          <span className={`${styles.badge} ${submitted ? styles.badgeSuccess : ''}`}>
            {submitted ? 'Submitted' : 'In progress'}
          </span>
        </div>

        <div className={styles.detailBody}>
          <aside className={styles.infoColumn}>
            <div className={styles.section}>
              <h3>Candidate profile</h3>
              {candidate?.desiredPosition && <p>Target role: {candidate.desiredPosition}</p>}
              {candidate?.targetPractice && <p>Practice: {candidate.targetPractice}</p>}
              {candidate?.targetOffice && <p>Office: {candidate.targetOffice}</p>}
              {resumeLink}
            </div>

            <div className={styles.section}>
              <h3>Case materials</h3>
              {renderFiles(selectedAssignment.caseFolder)}
            </div>

            <div className={styles.section}>
              <h3>Fit question</h3>
              {fitQuestion ? (
                <>
                  <p className={styles.fitTitle}>{fitQuestion.shortTitle}</p>
                  <p className={styles.fitBody}>{fitQuestion.content}</p>
                </>
              ) : (
                <p>No fit question is attached.</p>
              )}
            </div>
          </aside>

          <form className={styles.formColumn} onSubmit={handleSave}>
            {submitted && (
              <div className={styles.lockedBanner}>
                This feedback was submitted and is now read-only.
              </div>
            )}
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
              <label htmlFor="fitNotes">Fit notes</label>
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
              <label htmlFor="caseNotes">Case notes</label>
              <textarea
                id="caseNotes"
                rows={3}
                value={formState.caseNotes}
                onChange={(event) => setFormState((prev) => ({ ...prev, caseNotes: event.target.value }))}
                disabled={disableInputs}
              />
            </div>

            <div className={styles.formRow}>
              <label htmlFor="generalNotes">Additional comments</label>
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
                {saveLabel}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={disableInputs}
                onClick={() => setFormState(createFormState(selectedAssignment))}
              >
                Reset
              </button>
              <button
                type="button"
                className={styles.submitButton}
                disabled={disableInputs}
                onClick={handleSubmitFinal}
              >
                {submitLabel}
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
        <p>Access the materials, capture notes, and submit your evaluation once you are ready.</p>
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
