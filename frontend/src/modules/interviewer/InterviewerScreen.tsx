import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerScreen.module.css';
import { useAuth } from '../auth/AuthContext';
import { interviewerApi } from './services/interviewerApi';
import { InterviewAssignment } from '../../shared/types/interviewer';

const buildAssignmentKey = (assignment: InterviewAssignment) =>
  `${assignment.evaluationId}::${assignment.interview.id}`;

const parseInitialSelection = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const evaluationId = params.get('evaluation');
  const slotId = params.get('slot');
  if (evaluationId && slotId) {
    return `${evaluationId}::${slotId}`;
  }
  return null;
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    return date.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return value;
  }
};

const updateUrlSelection = (evaluationId: string, slotId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set('evaluation', evaluationId);
  params.set('slot', slotId);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', next);
};

interface FormState {
  fitScore?: number;
  caseScore?: number;
  notes: string;
  isSaving: boolean;
}

const buildFormState = (assignment: InterviewAssignment | null): FormState => ({
  fitScore: assignment?.form.fitScore,
  caseScore: assignment?.form.caseScore,
  notes: assignment?.form.notes ?? '',
  isSaving: false
});

export const InterviewerScreen = () => {
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<InterviewAssignment[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => parseInitialSelection());
  const [formState, setFormState] = useState<FormState>(() => buildFormState(null));
  const [banner, setBanner] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    const load = async () => {
      try {
        const data = await interviewerApi.list(session.email);
        setAssignments(data);
        if (!data.length) {
          setSelectedKey(null);
          setFormState(buildFormState(null));
          return;
        }
        const preferred = parseInitialSelection();
        const pending = data.find((item) => !item.form.submitted);
        const fallback = data[0];
        const initial =
          (preferred && data.find((item) => buildAssignmentKey(item) === preferred)) || pending || fallback;
        setSelectedKey(buildAssignmentKey(initial));
        setFormState(buildFormState(initial));
      } catch (error) {
        console.error('Failed to load assignments:', error);
        setLoadError('Не удалось загрузить список интервью. Попробуйте обновить страницу.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [session]);

  const selectedAssignment = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return assignments.find((item) => buildAssignmentKey(item) === selectedKey) ?? null;
  }, [assignments, selectedKey]);

  useEffect(() => {
    if (!selectedAssignment) {
      setFormState(buildFormState(null));
      return;
    }
    setFormState(buildFormState(selectedAssignment));
  }, [selectedAssignment?.evaluationId, selectedAssignment?.interview.id]);

  const currentAssignments = useMemo(
    () => assignments.filter((item) => !item.form.submitted),
    [assignments]
  );

  const historyAssignments = useMemo(
    () => assignments.filter((item) => item.form.submitted),
    [assignments]
  );

  const handleSelect = (assignment: InterviewAssignment) => {
    const key = buildAssignmentKey(assignment);
    setSelectedKey(key);
    setFormState(buildFormState(assignment));
    updateUrlSelection(assignment.evaluationId, assignment.interview.id);
    setBanner(null);
  };

  const updateAssignment = (next: InterviewAssignment) => {
    setAssignments((prev) => {
      const existingIndex = prev.findIndex((item) => buildAssignmentKey(item) === buildAssignmentKey(next));
      if (existingIndex === -1) {
        return prev;
      }
      const copy = [...prev];
      copy[existingIndex] = next;
      return copy;
    });
    setFormState(buildFormState(next));
    setBanner({
      type: next.form.submitted ? 'info' : 'info',
      text: next.form.submitted ? 'Форма отправлена интервьюеру.' : 'Черновик сохранён.'
    });
  };

  const sendForm = async (submit: boolean) => {
    if (!session || !selectedAssignment) {
      return;
    }
    setFormState((prev) => ({ ...prev, isSaving: true }));
    try {
      const updated = await interviewerApi.submit(session.email, selectedAssignment.evaluationId, selectedAssignment.interview.id, {
        fitScore: formState.fitScore,
        caseScore: formState.caseScore,
        notes: formState.notes,
        submit
      });
      updateAssignment(updated);
    } catch (error) {
      console.error('Failed to save assignment:', error);
      setBanner({ type: 'error', text: 'Не удалось сохранить форму. Попробуйте ещё раз.' });
      setFormState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleInputChange = (field: 'fitScore' | 'caseScore', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value ? Number(value) : undefined
    }));
  };

  const handleNotesChange = (value: string) => {
    setFormState((prev) => ({ ...prev, notes: value }));
  };

  const readyForSubmit = selectedAssignment?.form.submitted ? false : Boolean(formState.fitScore && formState.caseScore);

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Портал интервьюера</h1>
          <p className={styles.subtitle}>Просматривайте материалы кандидата и отправляйте оценки после интервью.</p>
        </div>
        <div className={styles.accountInfo}>Вход выполнен: {session?.email ?? '—'}</div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      {isLoading ? (
        <div className={styles.loadingState}>Загружаем ваши назначения…</div>
      ) : loadError ? (
        <div className={styles.errorBanner}>{loadError}</div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Пока нет назначенных интервью</h2>
          <p>Когда координатор назначит вам кандидата, вы увидите материалы и форму оценки здесь.</p>
        </div>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.listSection}>
              <h2>Текущие</h2>
              <ul className={styles.assignmentList}>
                {currentAssignments.map((assignment) => {
                  const key = buildAssignmentKey(assignment);
                  const isActive = key === selectedKey;
                  const candidateName = assignment.candidate
                    ? `${assignment.candidate.lastName} ${assignment.candidate.firstName}`.trim()
                    : 'Без имени';
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`${styles.assignmentButton} ${isActive ? styles.assignmentButtonActive : ''}`}
                        onClick={() => handleSelect(assignment)}
                      >
                        <span className={styles.assignmentName}>{candidateName || 'Кандидат'}</span>
                        <span className={styles.assignmentMeta}>
                          {assignment.roundNumber ? `Раунд ${assignment.roundNumber}` : 'Раунд не указан'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.listSection}>
              <h2>История</h2>
              <ul className={styles.assignmentList}>
                {historyAssignments.map((assignment) => {
                  const key = buildAssignmentKey(assignment);
                  const isActive = key === selectedKey;
                  const candidateName = assignment.candidate
                    ? `${assignment.candidate.lastName} ${assignment.candidate.firstName}`.trim()
                    : 'Без имени';
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`${styles.assignmentButton} ${isActive ? styles.assignmentButtonActive : ''}`}
                        onClick={() => handleSelect(assignment)}
                      >
                        <span className={styles.assignmentName}>{candidateName || 'Кандидат'}</span>
                        <span className={styles.assignmentMeta}>
                          {assignment.form.submittedAt
                            ? `Отправлено ${formatDateTime(assignment.form.submittedAt)}`
                            : 'Отправлено'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <main className={styles.mainPanel}>
            {!selectedAssignment ? (
              <div className={styles.placeholder}>Выберите интервью в списке, чтобы увидеть материалы.</div>
            ) : (
              <form
                className={styles.assignmentForm}
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void sendForm(true);
                }}
              >
                <section className={styles.panelSection}>
                  <h2>Информация о кандидате</h2>
                  <div className={styles.detailGrid}>
                    <div>
                      <span className={styles.detailLabel}>Имя</span>
                      <span className={styles.detailValue}>
                        {selectedAssignment.candidate
                          ? `${selectedAssignment.candidate.lastName} ${selectedAssignment.candidate.firstName}`.trim()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Целевая позиция</span>
                      <span className={styles.detailValue}>
                        {selectedAssignment.candidate?.desiredPosition ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Раунд</span>
                      <span className={styles.detailValue}>
                        {selectedAssignment.roundNumber ? `Раунд ${selectedAssignment.roundNumber}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Начало процесса</span>
                      <span className={styles.detailValue}>
                        {formatDateTime(selectedAssignment.processStartedAt)}
                      </span>
                    </div>
                  </div>
                  {selectedAssignment.candidate?.resume && (
                    <a
                      className={styles.primaryLink}
                      href={selectedAssignment.candidate.resume.dataUrl}
                      download={selectedAssignment.candidate.resume.fileName}
                    >
                      Скачать резюме ({Math.round(selectedAssignment.candidate.resume.size / 1024)} КБ)
                    </a>
                  )}
                </section>

                <section className={styles.panelSection}>
                  <h2>Материалы кейса</h2>
                  {selectedAssignment.caseFolder ? (
                    <ul className={styles.fileList}>
                      {selectedAssignment.caseFolder.files.map((file) => (
                        <li key={file.id}>
                          <a className={styles.secondaryLink} href={file.dataUrl} download={file.fileName}>
                            {file.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.mutedText}>Материалы кейса не прикреплены.</p>
                  )}
                </section>

                <section className={styles.panelSection}>
                  <h2>Фит-вопрос</h2>
                  {selectedAssignment.fitQuestion ? (
                    <div className={styles.questionBlock}>
                      <h3>{selectedAssignment.fitQuestion.shortTitle}</h3>
                      <p className={styles.questionContent}>{selectedAssignment.fitQuestion.content}</p>
                      {selectedAssignment.fitQuestion.criteria.length > 0 && (
                        <table className={styles.criteriaTable}>
                          <thead>
                            <tr>
                              <th>Критерий</th>
                              <th colSpan={5}>Оценки</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAssignment.fitQuestion.criteria.map((criterion) => (
                              <tr key={criterion.id}>
                                <td>{criterion.title}</td>
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <td key={score}>{criterion.ratings?.[score as 1 | 2 | 3 | 4 | 5] ?? '—'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    <p className={styles.mutedText}>Фит-вопрос не назначен.</p>
                  )}
                </section>

                <section className={styles.panelSection}>
                  <h2>Форма оценки</h2>
                  <div className={styles.formRow}>
                    <label className={styles.formField}>
                      <span>Оценка фит части</span>
                      <select
                        value={formState.fitScore ?? ''}
                        onChange={(event) => handleInputChange('fitScore', event.target.value)}
                        disabled={selectedAssignment.form.submitted}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.formField}>
                      <span>Оценка кейса</span>
                      <select
                        value={formState.caseScore ?? ''}
                        onChange={(event) => handleInputChange('caseScore', event.target.value)}
                        disabled={selectedAssignment.form.submitted}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className={styles.formField}>
                    <span>Комментарии</span>
                    <textarea
                      value={formState.notes}
                      onChange={(event) => handleNotesChange(event.target.value)}
                      placeholder="Основные сильные стороны, риски и рекомендации."
                      disabled={selectedAssignment.form.submitted}
                    />
                  </label>

                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={selectedAssignment.form.submitted || formState.isSaving}
                      onClick={() => {
                        void sendForm(false);
                      }}
                    >
                      Сохранить черновик
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={selectedAssignment.form.submitted || !readyForSubmit || formState.isSaving}
                    >
                      Отправить финальную оценку
                    </button>
                  </div>
                </section>
              </form>
            )}
          </main>
        </div>
      )}
    </section>
  );
};
