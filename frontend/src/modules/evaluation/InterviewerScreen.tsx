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
    return new Date(value).toLocaleString('ru-RU');
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
        setBanner({ type: 'error', text: 'Не удалось загрузить назначения. Обновите страницу позже.' });
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.email || !selectedAssignment) {
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await interviewerApi.submitForm(selectedAssignment.evaluationId, selectedAssignment.slotId, {
        email: session.email,
        submitted: formState.submitted,
        fitScore: formState.fitScore ? Number(formState.fitScore) : undefined,
        caseScore: formState.caseScore ? Number(formState.caseScore) : undefined,
        fitNotes: formState.fitNotes.trim() || undefined,
        caseNotes: formState.caseNotes.trim() || undefined,
        notes: formState.notes.trim() || undefined
      });
      await refreshAssignments();
      setBanner({ type: 'info', text: 'Оценка сохранена. Спасибо!' });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'access-denied') {
        setBanner({ type: 'error', text: 'У вас нет доступа к этому интервью.' });
      } else {
        console.error('Failed to submit interview form:', error);
        setBanner({ type: 'error', text: 'Не удалось сохранить форму. Попробуйте снова.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const renderList = () => {
    if (loading) {
      return <p>Загрузка назначений...</p>;
    }
    if (assignments.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2>Назначений пока нет</h2>
          <p>Как только администратор назначит вам интервью, оно появится здесь.</p>
        </div>
      );
    }
    return (
      <ul className={styles.list}>
        {assignments.map((assignment) => {
          const candidateName = assignment.candidate
            ? `${assignment.candidate.lastName} ${assignment.candidate.firstName}`.trim()
            : 'Кандидат не выбран';
          const submitted = assignment.form?.submitted ?? false;
          return (
            <li
              key={assignment.slotId}
              className={`${styles.listItem} ${selectedSlot === assignment.slotId ? styles.listItemActive : ''}`}
              onClick={() => setSelectedSlot(assignment.slotId)}
            >
              <div className={styles.listItemTitle}>{candidateName}</div>
              <p className={styles.listItemMeta}>
                {submitted ? 'Форма отправлена' : 'Ожидает оценки'} · Назначено {formatDateTime(assignment.invitationSentAt)}
              </p>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFiles = (folder: CaseFolder | undefined) => {
    if (!folder || folder.files.length === 0) {
      return <p>Файлы кейса не прикреплены.</p>;
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
          <h2>Выберите интервью</h2>
          <p>Слева находится список назначенных вам интервью. Выберите одно, чтобы открыть материалы.</p>
        </div>
      );
    }
    const candidate = selectedAssignment.candidate;
    const candidateName = candidate
      ? `${candidate.lastName} ${candidate.firstName}`.trim() || candidate.id
      : 'Кандидат не выбран';
    const submitted = selectedAssignment.form?.submitted ?? false;
    const fitQuestion = selectedAssignment.fitQuestion;
    const resumeLink = candidate?.resume ? (
      <a className={styles.fileLink} href={candidate.resume.dataUrl} download={candidate.resume.fileName}>
        Скачать резюме ({candidate.resume.fileName})
      </a>
    ) : (
      <p>Резюме недоступно.</p>
    );

    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.detailTitle}>{candidateName}</h2>
            <p>Назначено {formatDateTime(selectedAssignment.invitationSentAt)}</p>
          </div>
          <span className={`${styles.badge} ${submitted ? styles.badgeSuccess : ''}`}>
            {submitted ? 'Форма отправлена' : 'В работе'}
          </span>
        </div>

        <div className={styles.section}>
          <h3>Материалы по кандидату</h3>
          <p>Данные обновлены {formatDateTime(selectedAssignment.evaluationUpdatedAt)}</p>
          {resumeLink}
          {candidate?.desiredPosition && <p>Целевая позиция: {candidate.desiredPosition}</p>}
        </div>

        <div className={styles.section}>
          <h3>Кейс</h3>
          {renderFiles(selectedAssignment.caseFolder)}
        </div>

        <div className={styles.section}>
          <h3>Фит-вопрос</h3>
          {fitQuestion ? (
            <>
              <p>{fitQuestion.shortTitle}</p>
              <p>{fitQuestion.content}</p>
            </>
          ) : (
            <p>Фит-вопрос не выбран.</p>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label htmlFor="fitScore">Оценка за фит (1-5)</label>
            <select
              id="fitScore"
              value={formState.fitScore}
              onChange={(event) => setFormState((prev) => ({ ...prev, fitScore: event.target.value }))}
            >
              <option value="">Не выбрано</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label htmlFor="fitNotes">Комментарий по фит части</label>
            <textarea
              id="fitNotes"
              rows={3}
              value={formState.fitNotes}
              onChange={(event) => setFormState((prev) => ({ ...prev, fitNotes: event.target.value }))}
            />
          </div>

          <div className={styles.formRow}>
            <label htmlFor="caseScore">Оценка за кейс (1-5)</label>
            <select
              id="caseScore"
              value={formState.caseScore}
              onChange={(event) => setFormState((prev) => ({ ...prev, caseScore: event.target.value }))}
            >
              <option value="">Не выбрано</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label htmlFor="caseNotes">Комментарий по кейсу</label>
            <textarea
              id="caseNotes"
              rows={3}
              value={formState.caseNotes}
              onChange={(event) => setFormState((prev) => ({ ...prev, caseNotes: event.target.value }))}
            />
          </div>

          <div className={styles.formRow}>
            <label htmlFor="generalNotes">Общий комментарий</label>
            <textarea
              id="generalNotes"
              rows={4}
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className={styles.formRow}>
            <label>
              <input
                type="checkbox"
                checked={formState.submitted}
                onChange={(event) => setFormState((prev) => ({ ...prev, submitted: event.target.checked }))}
              />{' '}
              Отметить форму как отправленную
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить оценку'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={saving}
              onClick={() => setFormState(createFormState(selectedAssignment))}
            >
              Сбросить
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <header>
        <h1>Мои интервью</h1>
        <p>Здесь собраны все кандидаты, назначенные вам на интервью.</p>
      </header>

      {banner && (
        <div className={`${styles.banner} ${banner.type === 'info' ? styles.bannerInfo : styles.bannerError}`}>
          {banner.text}
        </div>
      )}

      <div className={styles.content}>
        <aside className={styles.listPanel}>
          <h2 className={styles.listTitle}>Назначения</h2>
          {renderList()}
        </aside>
        {renderDetail()}
      </div>
    </div>
  );
};
