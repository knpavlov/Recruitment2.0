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
import { useAuth } from '../auth/AuthContext';
import { InterviewerScreen } from './InterviewerScreen';

type Banner = { type: 'info' | 'error'; text: string } | null;

type SortKey = 'name' | 'position' | 'round' | 'avgFit' | 'avgCase';

export const EvaluationScreen = () => {
  const { session } = useAuth();
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

  if (session?.role === 'user') {
    return <InterviewerScreen />;
  }

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

  const handleStartProcess = useCallback(
    async (evaluation: EvaluationConfig) => {
      const result = await startProcess(evaluation.id);
      if (!result.ok) {
        if (result.error === 'missing-assignment-data') {
          setBanner({
            type: 'error',
            text: 'Assign interviewers, cases, and fit questions for every slot before starting the process.'
          });
          return;
        }
        if (result.error === 'process-already-started') {
          setBanner({ type: 'error', text: 'The evaluation process has already been started.' });
          return;
        }
        if (result.error === 'mailer-unavailable') {
          setBanner({ type: 'error', text: 'Email delivery is not configured. Configure the mailer and try again.' });
          return;
        }
        if (result.error === 'portal-url-missing') {
          setBanner({
            type: 'error',
            text: 'Set INTERVIEW_PORTAL_URL to a public site before sending invitations.'
          });
          return;
        }
        if (result.error === 'portal-url-invalid') {
          setBanner({
            type: 'error',
            text: 'INTERVIEW_PORTAL_URL must point to a public HTTPS address.'
          });
          return;
        }
        if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation not found. Refresh the page and try again.' });
          return;
        }
        setBanner({ type: 'error', text: 'Failed to start the evaluation process.' });
        return;
      }
      setBanner({
        type: 'info',
        text: 'Evaluation process started. Interviewers received their invitations by email.'
      });
    },
    [startProcess]
  );

  const tableRows = useMemo<EvaluationTableRow[]>(() => {
    return list.map((evaluation) => {
      const metadata = evaluation.candidateId ? candidateIndex.get(evaluation.candidateId) : undefined;
      const candidateName = metadata?.name ?? 'Not selected';
      const candidatePosition = metadata?.position ?? '—';
      const completedForms = evaluation.forms.filter((form) => form.submitted).length;
      const fitScores = evaluation.forms
        .filter((form) => form.submitted && typeof form.fitScore === 'number')
        .map((form) => form.fitScore as number);
      const caseScores = evaluation.forms
        .filter((form) => form.submitted && typeof form.caseScore === 'number')
        .map((form) => form.caseScore as number);
      const avgFitScore = fitScores.length
        ? fitScores.reduce((sum, score) => sum + score, 0) / fitScores.length
        : null;
      const avgCaseScore = caseScores.length
        ? caseScores.reduce((sum, score) => sum + score, 0) / caseScores.length
        : null;
      const roundNumber = evaluation.roundNumber ?? null;
      const slotsReady = evaluation.interviews.every((slot) => {
        const nameReady = slot.interviewerName.trim().length > 0;
        const emailReady = slot.interviewerEmail.trim().length > 0;
        const caseReady = Boolean(slot.caseFolderId?.trim());
        const fitReady = Boolean(slot.fitQuestionId?.trim());
        return nameReady && emailReady && caseReady && fitReady;
      });
      const startDisabled = evaluation.processStatus !== 'draft' || !slotsReady;

      return {
        id: evaluation.id,
        candidateName,
        candidatePosition,
        roundNumber,
        formsCompleted: completedForms,
        formsPlanned: evaluation.interviewCount,
        avgFitScore: avgFitScore != null && Number.isFinite(avgFitScore) ? avgFitScore : null,
        avgCaseScore: avgCaseScore != null && Number.isFinite(avgCaseScore) ? avgCaseScore : null,
        processStatus: evaluation.processStatus,
        onStartProcess: () => handleStartProcess(evaluation),
        startDisabled,
        onEdit: () => {
          setModalEvaluation(evaluation);
          setIsModalOpen(true);
        },
        onOpenStatus: () => setStatusEvaluation(evaluation)
      };
    });
  }, [candidateIndex, list, handleStartProcess]);

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
