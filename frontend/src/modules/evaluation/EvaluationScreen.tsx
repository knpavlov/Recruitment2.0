import { useCallback, useMemo, useState } from 'react';
import styles from '../../styles/EvaluationScreen.module.css';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationStatusModal } from './components/EvaluationStatusModal';
import {
  useEvaluationsState,
  useCandidatesState,
  useCasesState,
  useFitQuestionsState,
  useCaseCriteriaState
} from '../../app/state/AppStateContext';
import { EvaluationConfig } from '../../shared/types/evaluation';
import { EvaluationTable, EvaluationTableRow } from './components/EvaluationTable';

type Banner = { type: 'info' | 'error'; text: string } | null;

type SortKey = 'name' | 'position' | 'created' | 'round' | 'avgFit' | 'avgCase';

type StatusContext = {
  evaluation: EvaluationConfig;
  candidateName: string;
  candidatePosition: string;
  roundLabel: string;
};

type DecisionOption = 'offer' | 'progress' | 'reject';

const DECISION_LABELS: Record<DecisionOption, string> = {
  offer: 'Offer',
  progress: 'Progress to next round',
  reject: 'Reject'
};

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation, sendInvitations, advanceRound } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
  const { list: fitQuestions } = useFitQuestionsState();
  const { list: caseCriteria } = useCaseCriteriaState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalEvaluation, setModalEvaluation] = useState<EvaluationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusContext, setStatusContext] = useState<StatusContext | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roundSelections, setRoundSelections] = useState<Record<string, number>>({});
  const [decisionSelections, setDecisionSelections] = useState<Record<string, DecisionOption | null>>({});

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

  const handleSendInvites = useCallback(
    async (evaluation: EvaluationConfig, scope: 'all' | 'updated') => {
      const result = await sendInvitations(evaluation.id, scope);
      if (!result.ok) {
        if (result.error === 'missing-assignment-data') {
          setBanner({
            type: 'error',
            text: 'Assign interviewers, cases, and fit questions to every slot before sending invites.'
          });
          return;
        }
        if (result.error === 'invalid-assignment-data') {
          setBanner({
            type: 'error',
            text: 'Use valid cases and fit questions for every interview slot before sending invites.'
          });
          return;
        }
        if (result.error === 'invalid-assignment-resources') {
          setBanner({
            type: 'error',
            text: 'Some selected cases or fit questions are no longer available. Update assignments and try again.'
          });
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
        setBanner({ type: 'error', text: 'Failed to send invitations.' });
        return;
      }
      const message =
        scope === 'all'
          ? 'Invitations sent to interviewers.'
          : 'Updated invitations sent to selected interviewers.';
      setBanner({ type: 'info', text: message });
    },
    [sendInvitations]
  );

  const handleAdvanceRound = useCallback(
    async (evaluation: EvaluationConfig) => {
      const result = await advanceRound(evaluation.id);
      if (!result.ok) {
        if (result.error === 'forms-pending') {
          setBanner({
            type: 'error',
            text: 'Collect all interview feedback before progressing to the next round.'
          });
          return;
        }
        if (result.error === 'version-conflict') {
          setBanner({
            type: 'error',
            text: 'Version conflict. Refresh the page to view the latest data.'
          });
          return;
        }
        if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation not found. Refresh the page.' });
          return;
        }
        setBanner({ type: 'error', text: 'Failed to progress to the next round.' });
        return;
      }
      const nextRound = result.data.roundNumber ?? (evaluation.roundNumber ?? 1) + 1;
      setRoundSelections((prev) => ({ ...prev, [evaluation.id]: nextRound }));
      setDecisionSelections((prev) => ({ ...prev, [evaluation.id]: 'progress' }));
      setBanner({
        type: 'info',
        text: `Candidate moved to round ${nextRound}. Configure the new round and send invites to interviewers.`
      });
    },
    [advanceRound]
  );

  const tableRows = useMemo<EvaluationTableRow[]>(() => {
    return list.map((evaluation) => {
      const metadata = evaluation.candidateId ? candidateIndex.get(evaluation.candidateId) : undefined;
      const candidateName = metadata?.name ?? 'Not selected';
      const candidatePosition = metadata?.position ?? '—';
      const createdAtIso = evaluation.createdAt ?? null;
      const createdDate = createdAtIso ? new Date(createdAtIso) : null;
      const createdOn = createdDate && !Number.isNaN(createdDate.getTime())
        ? createdDate.toLocaleDateString('ru-RU')
        : '—';

      const currentRound = evaluation.roundNumber ?? 1;
      const storedSelection = roundSelections[evaluation.id];
      const snapshot =
        storedSelection && storedSelection !== currentRound
          ? evaluation.roundHistory.find((round) => round.roundNumber === storedSelection)
          : undefined;
      const effectiveSelectedRound = snapshot ? snapshot.roundNumber : currentRound;
      const isHistoricalView = Boolean(snapshot);

      const roundInterviews = snapshot ? snapshot.interviews : evaluation.interviews;
      const roundForms = snapshot ? snapshot.forms : evaluation.forms;
      const roundProcessStatus = snapshot ? snapshot.processStatus : evaluation.processStatus;
      const roundInterviewCount = snapshot ? snapshot.interviewCount : evaluation.interviewCount;

      const submittedForms = roundForms.filter((form) => form.submitted);
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
      const offerSummary = totalOffers
        ? (['yes_priority', 'yes_strong', 'yes_keep_warm', 'no_offer'] as const)
            .map((key) => `${Math.round((offerTotals[key] / totalOffers) * 100)}%`)
            .join(' / ')
        : '—';

      const roundOptionsMap = new Map<number, string>();
      evaluation.roundHistory.forEach((round) => {
        roundOptionsMap.set(round.roundNumber, `Round ${round.roundNumber}`);
      });
      roundOptionsMap.set(currentRound, `Round ${currentRound}`);
      const roundOptions = Array.from(roundOptionsMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([value, label]) => ({ value, label }));
      const roundLabel =
        roundOptions.find((option) => option.value === effectiveSelectedRound)?.label ??
        `Round ${effectiveSelectedRound}`;

      const formsPlanned = roundInterviews.length || roundInterviewCount;
      const formsCompleted = submittedForms.length;

      const slotsReady = evaluation.interviews.every((slot) => {
        const nameReady = slot.interviewerName.trim().length > 0;
        const emailReady = slot.interviewerEmail.trim().length > 0;
        const caseReady = Boolean(slot.caseFolderId?.trim());
        const fitReady = Boolean(slot.fitQuestionId?.trim());
        return nameReady && emailReady && caseReady && fitReady;
      });
      const emailsReady = evaluation.interviews.every((slot) => slot.interviewerEmail.trim().length > 0);
      const formsBySlot = new Map(evaluation.forms.map((form) => [form.slotId, form]));
      const allFormsSubmitted =
        evaluation.interviews.length > 0 &&
        evaluation.interviews.every((slot) => formsBySlot.get(slot.id)?.submitted === true);

      let invitesTooltip: string | undefined;
      let invitesDisabled = false;
      if (isHistoricalView) {
        invitesDisabled = true;
        invitesTooltip = 'Switch to the current round to manage invitations.';
      } else if (!emailsReady) {
        invitesDisabled = true;
        invitesTooltip = 'Add email addresses for every interviewer before sending invites.';
      } else if (!slotsReady) {
        invitesDisabled = true;
        invitesTooltip = 'Complete all interviewer, case and fit question assignments before sending invites.';
      }

      const invitesMenuAvailable =
        evaluation.invitationState.hasInvitations && evaluation.invitationState.hasPendingChanges && !isHistoricalView;
      const invitesButtonLabel = evaluation.invitationState.hasInvitations ? 'Send Invites Again' : 'Send Invites';
      if (!invitesDisabled && evaluation.invitationState.hasInvitations && !evaluation.invitationState.hasPendingChanges) {
        invitesTooltip = 'Invitations were already sent. Use this action to resend the same details.';
      }

      const decisionDisabled = isHistoricalView || !allFormsSubmitted;
      let decisionTooltip: string | undefined;
      if (isHistoricalView) {
        decisionTooltip = 'Switch to the current round to choose a decision.';
      } else if (!allFormsSubmitted) {
        decisionTooltip = 'Wait until every interviewer submits their evaluation to enable these actions.';
      }

      const decisionSelection = decisionSelections[evaluation.id] ?? null;
      const decisionLabel = decisionSelection ? DECISION_LABELS[decisionSelection] : 'Decision';

      const evaluationForModal = snapshot
        ? {
            ...evaluation,
            roundNumber: snapshot.roundNumber,
            interviewCount: snapshot.interviewCount,
            interviews: snapshot.interviews,
            forms: snapshot.forms,
            processStatus: snapshot.processStatus,
            processStartedAt: snapshot.processStartedAt,
            fitQuestionId: snapshot.fitQuestionId
          }
        : evaluation;

      const changeRound = (round: number) => {
        if (round === currentRound) {
          setRoundSelections((prev) => {
            const next = { ...prev };
            delete next[evaluation.id];
            return next;
          });
          return;
        }
        setRoundSelections((prev) => ({ ...prev, [evaluation.id]: round }));
      };

      const sendAll = () => {
        void handleSendInvites(evaluation, 'all');
      };

      const sendUpdated = () => {
        void handleSendInvites(evaluation, 'updated');
      };

      const decide = (option: DecisionOption) => {
        if (option === 'progress') {
          void handleAdvanceRound(evaluation);
          return;
        }
        setDecisionSelections((prev) => ({ ...prev, [evaluation.id]: option }));
        setBanner({ type: 'info', text: `Decision updated: ${DECISION_LABELS[option]}.` });
      };

      const processLabel =
        roundProcessStatus === 'in-progress'
          ? 'In progress'
          : roundProcessStatus === 'completed'
            ? 'Completed'
            : 'Draft';

      return {
        id: evaluation.id,
        candidateName,
        candidatePosition,
        createdAt: createdAtIso,
        createdOn,
        roundOptions,
        selectedRound: effectiveSelectedRound,
        roundNumber: effectiveSelectedRound,
        onRoundChange: changeRound,
        isHistoricalView,
        formsCompleted,
        formsPlanned,
        avgFitScore,
        avgCaseScore,
        offerSummary,
        processLabel,
        invitesButtonLabel,
        invitesDisabled,
        invitesTooltip,
        invitesMenuAvailable,
        onSendInvitesAll: sendAll,
        onSendInvitesUpdated: sendUpdated,
        onEdit: () => {
          setModalEvaluation(evaluation);
          setIsModalOpen(true);
        },
        onOpenStatus: () =>
          setStatusContext({
            evaluation: evaluationForModal,
            candidateName,
            candidatePosition,
            roundLabel
          }),
        decisionDisabled,
        decisionTooltip,
        decisionLabel,
        decisionState: decisionSelection,
        onDecisionSelect: decide
      } satisfies EvaluationTableRow;
    });
  }, [
    candidateIndex,
    list,
    roundSelections,
    decisionSelections,
    handleSendInvites,
    handleAdvanceRound,
    setBanner
  ]);

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
      } else if (sortKey === 'created') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Number.NEGATIVE_INFINITY;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Number.NEGATIVE_INFINITY;
        result = timeA - timeB;
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
          <h1>Evaluation management</h1>
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

      {statusContext && (
        <EvaluationStatusModal
          evaluation={statusContext.evaluation}
          candidateName={statusContext.candidateName}
          candidatePosition={statusContext.candidatePosition}
          roundLabel={statusContext.roundLabel}
          fitQuestions={fitQuestions}
          caseCriteria={caseCriteria}
          caseFolders={folders}
          onClose={() => setStatusContext(null)}
        />
      )}
    </section>
  );
};
