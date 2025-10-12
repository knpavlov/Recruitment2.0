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
            text: 'Assign interviewers, cases, and fit questions to every slot before starting the process.'
          });
          return;
        }
        if (result.error === 'process-already-started') {
          setBanner({ type: 'error', text: 'This evaluation process has already been started.' });
          return;
        }
        if (result.error === 'mailer-unavailable') {
          setBanner({ type: 'error', text: 'Email delivery is not configured. Interviewers were not notified.' });
          return;
        }
        if (result.error === 'invalid-portal-url') {
          setBanner({
            type: 'error',
            text: 'Provide a reachable interviewer portal URL (environment variable or current site origin).' 
          });
          return;
        }
        if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation not found. Refresh the page.' });
          return;
        }
        setBanner({ type: 'error', text: 'Failed to start the evaluation process.' });
        return;
      }
      setBanner({ type: 'info', text: 'Evaluation process started. Interviewers received an email invitation.' });
    },
    [startProcess]
  );

  const tableRows = useMemo<EvaluationTableRow[]>(() => {
    return list.map((evaluation) => {
      const metadata = evaluation.candidateId ? candidateIndex.get(evaluation.candidateId) : undefined;
      const candidateName = metadata?.name ?? 'Not selected';
      const candidatePosition = metadata?.position ?? '—';
      const completedForms = evaluation.forms.filter((form) => form.submitted).length;
      const submittedForms = evaluation.forms.filter((form) => form.submitted);
      const formsBySlot = new Map(evaluation.forms.map((form) => [form.slotId, form]));
      const fitScores = submittedForms
        .map((form) => form.fitScore)
        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
      const caseScores = submittedForms
        .map((form) => form.caseScore)
        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
      const avgFitScore = fitScores.length
        ? fitScores.reduce((sum, value) => sum + value, 0) / fitScores.length
        : null;
      const avgCaseScore = caseScores.length
        ? caseScores.reduce((sum, value) => sum + value, 0) / caseScores.length
        : null;
      const offerTotals: Record<'yes_priority' | 'yes_strong' | 'yes_keep_warm' | 'no_offer', number> = {
        yes_priority: 0,
        yes_strong: 0,
        yes_keep_warm: 0,
        no_offer: 0
      };
      const offerResponses = submittedForms.filter((form) => typeof form.offerRecommendation === 'string');
      for (const response of offerResponses) {
        if (response.offerRecommendation && response.offerRecommendation in offerTotals) {
          offerTotals[response.offerRecommendation as keyof typeof offerTotals] += 1;
        }
      }
      const totalOffers = offerResponses.length;
      const offerPercentages = totalOffers
        ? (['yes_priority', 'yes_strong', 'yes_keep_warm', 'no_offer'] as const)
            .map((key) => `${Math.round((offerTotals[key] / totalOffers) * 100)}%`)
            .join(' / ')
        : '—';
      const offerSummaryTooltip = totalOffers
        ? [
            `Yes, priority — ${offerTotals.yes_priority}`,
            `Yes, meets high bar — ${offerTotals.yes_strong}`,
            `Turndown, stay in contact — ${offerTotals.yes_keep_warm}`,
            `Turndown — ${offerTotals.no_offer}`
          ].join('\n')
        : undefined;
      const roundNumber = evaluation.roundNumber ?? null;
      const nameReady = evaluation.interviews.every((slot) => slot.interviewerName.trim().length > 0);
      const emailReady = evaluation.interviews.every((slot) => slot.interviewerEmail.trim().length > 0);
      const caseReady = evaluation.interviews.every((slot) => Boolean(slot.caseFolderId?.trim()));
      const fitReady = evaluation.interviews.every((slot) => Boolean(slot.fitQuestionId?.trim()));

      let startTooltip: string | undefined;
      let startDisabled = false;
      if (evaluation.processStatus !== 'draft') {
        startDisabled = true;
        startTooltip = 'Invitations have already been sent to interviewers.';
      } else if (!emailReady) {
        startDisabled = true;
        startTooltip = 'Fill in every interviewer email before starting the process.';
      } else if (!nameReady || !caseReady || !fitReady) {
        startDisabled = true;
        startTooltip = 'Assign interviewers, cases, and fit questions to every slot.';
      }

      const allScoresCompleted =
        evaluation.interviews.length > 0 &&
        evaluation.interviews.every((slot) => {
          const form = formsBySlot.get(slot.id);
          if (!form) {
            return false;
          }
          const fitScoreReady = typeof form.fitScore === 'number' && Number.isFinite(form.fitScore);
          const caseScoreReady = typeof form.caseScore === 'number' && Number.isFinite(form.caseScore);
          return form.submitted && fitScoreReady && caseScoreReady;
        });
      const finalActionsDisabled = !allScoresCompleted;
      const finalActionsTooltip = finalActionsDisabled
        ? 'Wait until every interviewer submits both fit and case scores.'
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
        offerSummary: offerPercentages,
        offerSummaryTooltip,
        processStatus: evaluation.processStatus,
        onStartProcess: () => handleStartProcess(evaluation),
        startDisabled,
        startTooltip,
        onEdit: () => {
          setModalEvaluation(evaluation);
          setIsModalOpen(true);
        },
        onOpenStatus: () => setStatusEvaluation(evaluation),
        offerActionDisabled: finalActionsDisabled,
        offerActionTooltip: finalActionsTooltip,
        rejectActionDisabled: finalActionsDisabled,
        rejectActionTooltip: finalActionsTooltip,
        advanceActionDisabled: finalActionsDisabled,
        advanceActionTooltip: finalActionsTooltip,
        onOffer: () => undefined,
        onReject: () => undefined,
        onAdvance: () => undefined
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
        <EvaluationStatusModal
          evaluation={statusEvaluation}
          onClose={() => setStatusEvaluation(null)}
          folders={folders}
          fitQuestions={fitQuestions}
        />
      )}
    </section>
  );
};
