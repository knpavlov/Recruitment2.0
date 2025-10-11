import { useCallback, useMemo, useState } from 'react';
import styles from '../../styles/EvaluationScreen.module.css';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationStatusModal } from './components/EvaluationStatusModal';
import {
  useEvaluationsState,
  useCandidatesState,
  useCasesState,
  useFitQuestionsState
} from '../../app/state/AppStateContext';
import { EvaluationConfig } from '../../shared/types/evaluation';
import { EvaluationTable, EvaluationTableRow } from './components/EvaluationTable';

type Banner = { type: 'info' | 'error'; text: string } | null;

type SortKey = 'name' | 'position' | 'round' | 'avgFit' | 'avgCase';

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation, startProcess } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
  const { list: fitQuestions } = useFitQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalEvaluation, setModalEvaluation] = useState<EvaluationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusEvaluation, setStatusEvaluation] = useState<EvaluationConfig | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const candidateIndex = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        position: string;
      }
    >();
    candidates.forEach((candidate) => {
      const name = `${candidate.lastName} ${candidate.firstName}`.trim() || 'Not selected';
      const position = candidate.desiredPosition?.trim() || '—';
      map.set(candidate.id, { name, position });
    });
    return map;
  }, [candidates]);

  const handleStart = useCallback(
    async (evaluation: EvaluationConfig) => {
      const result = await startProcess(evaluation.id);
      if (!result.ok) {
        if (result.error === 'mailer-unavailable') {
          setBanner({ type: 'error', text: 'SMTP не настроен. Отправка приглашений невозможна.' });
          return;
        }
        if (result.error === 'version-conflict') {
          setBanner({ type: 'error', text: 'Процесс уже был запущен ранее.' });
          return;
        }
        if (result.error === 'invalid-input') {
          setBanner({ type: 'error', text: 'Заполните всех интервьюеров, кейсы и фит вопросы.' });
          return;
        }
        if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation no longer exists. Refresh the list.' });
          return;
        }
        setBanner({ type: 'error', text: 'Не удалось запустить процесс.' });
        return;
      }
      setBanner({ type: 'info', text: 'Процесс оценки запущен. Интервьюеры получили письма.' });
    },
    [setBanner, startProcess]
  );

  const tableRows = useMemo<EvaluationTableRow[]>(() => {
    return list.map((evaluation) => {
      const metadata = evaluation.candidateId ? candidateIndex.get(evaluation.candidateId) : undefined;
      const candidateName = metadata?.name ?? 'Not selected';
      const candidatePosition = metadata?.position ?? '—';
      const completedForms = evaluation.forms.filter((form) => form.submitted).length;
      const roundNumber = evaluation.roundNumber ?? null;
      const fitScores = evaluation.forms
        .map((form) => form.fitScore)
        .filter((score): score is number => typeof score === 'number');
      const caseScores = evaluation.forms
        .map((form) => form.caseScore)
        .filter((score): score is number => typeof score === 'number');

      const avgFitScore = fitScores.length ? fitScores.reduce((sum, value) => sum + value, 0) / fitScores.length : null;
      const avgCaseScore = caseScores.length
        ? caseScores.reduce((sum, value) => sum + value, 0) / caseScores.length
        : null;

      let canStart = evaluation.processStatus === 'draft';
      const issues: string[] = [];
      if (!evaluation.candidateId) {
        canStart = false;
        issues.push('Выберите кандидата.');
      }
      if (evaluation.interviews.length === 0) {
        canStart = false;
        issues.push('Добавьте хотя бы одно интервью.');
      }

      evaluation.interviews.forEach((slot, index) => {
        const slotLabel = `Интервью ${index + 1}`;
        if (!slot.interviewerName.trim()) {
          canStart = false;
          issues.push(`${slotLabel}: укажите имя интервьюера.`);
        }
        if (!slot.interviewerEmail.trim()) {
          canStart = false;
          issues.push(`${slotLabel}: укажите почту интервьюера.`);
        }
        if (!slot.caseFolderId) {
          canStart = false;
          issues.push(`${slotLabel}: выберите кейс.`);
        }
        const fitQuestionId = slot.fitQuestionId ?? evaluation.fitQuestionId;
        if (!fitQuestionId) {
          canStart = false;
          issues.push(`${slotLabel}: назначьте фит-вопрос.`);
        }
      });

      if (evaluation.processStatus === 'active') {
        canStart = false;
      }
      if (evaluation.processStatus === 'completed') {
        canStart = false;
      }

      const startTooltip = !canStart
        ? evaluation.processStatus === 'active'
          ? 'Процесс уже запущен.'
          : evaluation.processStatus === 'completed'
            ? 'Процесс завершен.'
            : issues.join('\n') || 'Заполните все поля перед запуском.'
        : undefined;

      return {
        id: evaluation.id,
        candidateName,
        candidatePosition,
        roundNumber,
        formsCompleted: completedForms,
        formsPlanned: evaluation.interviewCount,
        avgFitScore,
        avgCaseScore,
        canStart,
        processStatus: evaluation.processStatus,
        startTooltip,
        onEdit: () => {
          setModalEvaluation(evaluation);
          setIsModalOpen(true);
        },
        onOpenStatus: () => setStatusEvaluation(evaluation),
        onStart: () => handleStart(evaluation)
      };
    });
  }, [candidateIndex, list, handleStart]);

  const sortedRows = useMemo(() => {
    const copy = [...tableRows];

    const compareStrings = (a: string, b: string) => a.localeCompare(b, 'en-US', { sensitivity: 'base' });
    const compareNumbers = (a: number | null, b: number | null) => {
      const safeA = a ?? Number.NEGATIVE_INFINITY;
      const safeB = b ?? Number.NEGATIVE_INFINITY;
      return safeA - safeB;
    };

    copy.sort((a, b) => {
      let result = 0;
      if (sortKey === 'name') {
        result = compareStrings(a.candidateName, b.candidateName);
      } else if (sortKey === 'position') {
        result = compareStrings(a.candidatePosition, b.candidatePosition);
      } else if (sortKey === 'round') {
        result = compareNumbers(a.roundNumber, b.roundNumber);
      } else if (sortKey === 'avgFit') {
        result = compareNumbers(a.avgFitScore, b.avgFitScore);
      } else if (sortKey === 'avgCase') {
        result = compareNumbers(a.avgCaseScore, b.avgCaseScore);
      }

      if (result === 0 && sortKey !== 'name') {
        result = compareStrings(a.candidateName, b.candidateName);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return copy;
  }, [sortDirection, sortKey, tableRows]);

  const handleCreate = () => {
    setModalEvaluation(null);
    setIsModalOpen(true);
  };

  const handleSortChange = (key: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const handleSave = async (
    evaluation: EvaluationConfig,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => {
    const result = await saveEvaluation(evaluation, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setBanner({
          type: 'error',
          text: 'Version conflict. Refresh the page to view the latest data.'
        });
      } else if (result.error === 'not-found') {
        setBanner({
          type: 'error',
          text: 'Evaluation no longer exists. Refresh the list to continue.'
        });
      } else {
        setBanner({
          type: 'error',
          text: 'Select a candidate and make sure all fields are filled.'
        });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Evaluation settings saved.' });
    if (options.closeAfterSave) {
      setModalEvaluation(null);
      setIsModalOpen(false);
    } else {
      setModalEvaluation(result.data);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete the evaluation setup and all related interviews?');
    if (!confirmed) {
      return;
    }
    const result = await removeEvaluation(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Failed to delete the evaluation.' });
      return;
    }
    setBanner({ type: 'info', text: 'Evaluation removed.' });
    setModalEvaluation(null);
    setIsModalOpen(false);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Candidate evaluation</h1>
          <p className={styles.subtitle}>Configure interviews and track the status of evaluation forms.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Create evaluation
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <EvaluationTable
        rows={sortedRows}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {isModalOpen && (
        <EvaluationModal
          initialConfig={modalEvaluation}
          onClose={() => {
            setIsModalOpen(false);
            setModalEvaluation(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          candidates={candidates}
          folders={folders}
          fitQuestions={fitQuestions}
        />
      )}

      {statusEvaluation && (
        <EvaluationStatusModal evaluation={statusEvaluation} onClose={() => setStatusEvaluation(null)} />
      )}
    </section>
  );
};
