import { useEffect, useMemo, useState } from 'react';
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
      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted,
        fitScore: formState.fitScore ? Number(formState.fitScore) : undefined,
        caseScore: formState.caseScore ? Number(formState.caseScore) : undefined,
        fitNotes: formState.fitNotes.trim() || undefined,
        caseNotes: formState.caseNotes.trim() || undefined,
        notes: formState.notes.trim() || undefined
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

  const handleReset = () => {
    if (!selectedAssignment) {
      return;
    }
    setFormState(createFormState(selectedAssignment));
    setBanner(null);
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
          const submitted = assignment.form?.submitted ?? false;
          const statusLabel = submitted ? 'Submitted' : 'Awaiting feedback';
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
          <p>Use the list on the left to open candidate materials and share your feedback.</p>
        </div>
      );
    }
    const candidate = selectedAssignment.candidate;
    const candidateName = candidate
      ? `${candidate.lastName} ${candidate.firstName}`.trim() || candidate.id
      : 'Candidate not assigned';
    const fitQuestion = selectedAssignment.fitQuestion;
    const resumeLink = candidate?.resume ? (
      <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
        Download resume ({candidate.resume.fileName})
      </a>
    ) : (
      <p>Resume is not available.</p>
    );
    const submittedAtLabel = selectedAssignment.form?.submittedAt
      ? formatDateTime(selectedAssignment.form?.submittedAt)
      : null;

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <p>Assigned {formatDateTime(selectedAssignment.invitationSentAt)}</p>
          </div>
          <span className={`${styles.badge} ${isSubmitted ? styles.badgeSuccess : ''}`}>
            {isSubmitted ? 'Submitted' : 'In progress'}
          </span>
        </div>
        <div className={styles.detailColumns}>
          <div className={styles.infoColumn}>
            <div className={styles.section}>
              <h3>Candidate</h3>
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
                  <p className={styles.fitQuestionTitle}>{fitQuestion.shortTitle}</p>
                  <p className={styles.fitQuestionContent}>{fitQuestion.content}</p>
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
                <button
                  type="button"
                  className={styles.ghostButton}
                  disabled={disableInputs}
                  onClick={handleReset}
                >
                  Reset
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
