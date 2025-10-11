import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/InterviewerPortal.module.css';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { evaluationsApi } from '../evaluation/services/evaluationsApi';
import { InterviewerAssignment } from '../../shared/types/evaluation';
import { AssignmentList, buildAssignmentKey } from './components/AssignmentList';
import { AssignmentDetails } from './components/AssignmentDetails';
import { ApiError } from '../../shared/api/httpClient';

interface FormState {
  fitScore: string;
  caseScore: string;
  notes: string;
}

const defaultFormState: FormState = { fitScore: '', caseScore: '', notes: '' };

const parseScore = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return NaN;
  }
  return parsed;
};

export const InterviewerApp = () => {
  const { session, logout } = useAuth();
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAssignments = useCallback(
    async (preserveSelection: boolean) => {
      if (!session) {
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
        const remote = await evaluationsApi.listAssignments(session.email);
        setAssignments(remote);
        setSelectedKey((current) => {
          if (preserveSelection && current && remote.some((item) => buildAssignmentKey(item) === current)) {
            return current;
          }
          return remote.length ? buildAssignmentKey(remote[0]) : null;
        });
      } catch (error) {
        console.error('Failed to load assignments:', error);
        setLoadError('Не удалось загрузить назначения. Попробуйте обновить страницу.');
        setAssignments([]);
        setSelectedKey(null);
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) {
      setAssignments([]);
      setSelectedKey(null);
      return;
    }
    void loadAssignments(false);
  }, [session, loadAssignments]);

  const selectedAssignment = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return assignments.find((assignment) => buildAssignmentKey(assignment) === selectedKey) ?? null;
  }, [assignments, selectedKey]);

  useEffect(() => {
    if (!selectedAssignment) {
      setFormState(defaultFormState);
      return;
    }
    setFormState({
      fitScore: selectedAssignment.form.fitScore != null ? String(selectedAssignment.form.fitScore) : '',
      caseScore: selectedAssignment.form.caseScore != null ? String(selectedAssignment.form.caseScore) : '',
      notes: selectedAssignment.form.notes ?? ''
    });
  }, [selectedAssignment]);

  const updateForm = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (submit: boolean) => {
    if (!session || !selectedAssignment) {
      return;
    }

    const fitScore = parseScore(formState.fitScore);
    const caseScore = parseScore(formState.caseScore);
    if (submit && (fitScore === undefined || caseScore === undefined || Number.isNaN(fitScore) || Number.isNaN(caseScore))) {
      setBanner({ type: 'error', text: 'Укажите оценки за fit и кейс в диапазоне 1–5.' });
      return;
    }
    if ((fitScore !== undefined && Number.isNaN(fitScore)) || (caseScore !== undefined && Number.isNaN(caseScore))) {
      setBanner({ type: 'error', text: 'Используйте числа от 1 до 5 с шагом 0.5.' });
      return;
    }

    setIsSaving(true);
    setBanner(null);
    try {
      await evaluationsApi.submitForm(
        selectedAssignment.evaluationId,
        selectedAssignment.slotId,
        session.email,
        {
          fitScore: Number.isNaN(fitScore as number) ? undefined : fitScore,
          caseScore: Number.isNaN(caseScore as number) ? undefined : caseScore,
          notes: formState.notes.trim() || undefined,
          submitted: submit
        },
        selectedAssignment.evaluationVersion
      );
      await loadAssignments(true);
      setBanner({
        type: 'info',
        text: submit ? 'Оценка отправлена.' : 'Черновик сохранен.'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'version-conflict') {
          setBanner({ type: 'error', text: 'Данные устарели. Перезагрузите список интервью.' });
          await loadAssignments(false);
        } else if (error.code === 'process-not-started') {
          setBanner({ type: 'error', text: 'Организатор ещё не запустил этот процесс.' });
        } else if (error.code === 'not-found') {
          setBanner({ type: 'error', text: 'Назначение больше не доступно.' });
        } else if (error.code === 'invalid-input') {
          setBanner({ type: 'error', text: 'Заполните поля корректно, чтобы сохранить оценку.' });
        } else {
          setBanner({ type: 'error', text: 'Не удалось сохранить оценку. Попробуйте снова.' });
        }
      } else {
        setBanner({ type: 'error', text: 'Не удалось сохранить оценку. Попробуйте снова.' });
        console.error('Failed to submit interviewer form:', error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className={styles.portal}>
      <header className={styles.portalHeader}>
        <div className={styles.portalBrand}>
          <h1>Интервьюер</h1>
          <p>Рабочее место для оценки кандидатов</p>
        </div>
        <div className={styles.logoutSection}>
          <span>{session.email}</span>
          <button className={styles.logoutButton} onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <main className={styles.portalBody}>
        <aside className={styles.listPane}>
          {isLoading && <div>Загрузка назначений…</div>}
          {loadError && <div className={styles.errorBanner}>{loadError}</div>}
          {!isLoading && !loadError && (
            <AssignmentList assignments={assignments} selectedKey={selectedKey} onSelect={setSelectedKey} />
          )}
        </aside>

        <section className={styles.detailsPane}>
          <AssignmentDetails
            assignment={selectedAssignment}
            formState={formState}
            onChange={updateForm}
            onSaveDraft={() => void handleSave(false)}
            onSubmitFinal={() => void handleSave(true)}
            isSaving={isSaving}
            banner={banner}
          />
        </section>
      </main>
    </div>
  );
};
