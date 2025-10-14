import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { createNextRoundConfig } from './utils/configFactory';

type Banner = { type: 'info' | 'error'; text: string } | null;

type SortKey = 'name' | 'position' | 'round' | 'avgFit' | 'avgCase' | 'createdOn';

type StatusContext = {
  evaluation: EvaluationConfig;
  candidateName: string;
  candidatePosition: string;
  roundLabel: string;
};

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation, startProcess, resendInvitations } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
  const { list: fitQuestions } = useFitQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalEvaluation, setModalEvaluation] = useState<EvaluationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusContext, setStatusContext] = useState<StatusContext | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRounds, setSelectedRounds] = useState<Record<string, string>>({});
  const [decisionSelections, setDecisionSelections] = useState<Record<string, string>>({});

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

  useEffect(() => {
    setDecisionSelections((prev) => {
      const validIds = new Set(list.map((evaluation) => evaluation.id));
      let changed = false;
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([id, label]) => {
        if (validIds.has(id)) {
          next[id] = label;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [list]);

  const evaluationGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        candidateId?: string;
        evaluations: EvaluationConfig[];
      }
    >();

    list.forEach((evaluation) => {
      const key = evaluation.candidateId ?? evaluation.id;
      const current = map.get(key);
      if (current) {
        current.evaluations.push(evaluation);
      } else {
        map.set(key, { candidateId: evaluation.candidateId, evaluations: [evaluation] });
      }
    });

    return Array.from(map.entries()).map(([key, value]) => {
      const metadata = value.candidateId ? candidateIndex.get(value.candidateId) : undefined;
      const candidateName = metadata?.name ?? 'Not selected';
      const candidatePosition = metadata?.position ?? '—';
      const sorted = [...value.evaluations].sort((a, b) => {
        const roundA = typeof a.roundNumber === 'number' ? a.roundNumber : 0;
        const roundB = typeof b.roundNumber === 'number' ? b.roundNumber : 0;
        if (roundA !== roundB) {
          return roundA - roundB;
        }
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdA - createdB;
      });

      const defaultEvaluation = sorted[sorted.length - 1];
      const roundOptions = sorted.map((evaluation) => ({
        id: evaluation.id,
        label:
          typeof evaluation.roundNumber === 'number'
            ? `Round ${evaluation.roundNumber}`
            : 'Round —'
      }));

      return {
        key,
        candidateId: value.candidateId,
        candidateName,
        candidatePosition,
        evaluations: sorted,
        defaultEvaluationId: defaultEvaluation?.id ?? key,
        roundOptions
      };
    });
  }, [candidateIndex, list]);

  useEffect(() => {
    setSelectedRounds((prev) => {
      let changed = false;
      const next: Record<string, string> = {};

      for (const group of evaluationGroups) {
        const options = group.roundOptions;
        const fallback = options[options.length - 1]?.id ?? group.defaultEvaluationId;
        const previous = prev[group.key];
        if (previous && options.some((option) => option.id === previous)) {
          next[group.key] = previous;
        } else if (fallback) {
          next[group.key] = fallback;
          if (previous !== fallback) {
            changed = true;
          }
        }
      }

      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      } else {
        for (const key of Object.keys(next)) {
          if (prev[key] !== next[key]) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [evaluationGroups]);

  const handleDecisionSelection = useCallback(
    async (evaluation: EvaluationConfig, action: 'offer' | 'progress' | 'reject') => {
      if (action === 'offer') {
        setDecisionSelections((prev) => ({ ...prev, [evaluation.id]: 'Offer' }));
        return;
      }
      if (action === 'reject') {
        setDecisionSelections((prev) => ({ ...prev, [evaluation.id]: 'Reject' }));
        return;
      }

      setDecisionSelections((prev) => ({ ...prev, [evaluation.id]: 'Progress to next round' }));

      if (!evaluation.candidateId) {
        setBanner({
          type: 'error',
          text: 'Select a candidate before progressing to the next round.'
        });
        return;
      }

      const nextRoundConfig = createNextRoundConfig(evaluation);
      const result = await saveEvaluation(nextRoundConfig, null);
      if (!result.ok) {
        if (result.error === 'invalid-input') {
          setBanner({
            type: 'error',
            text: 'Unable to prepare the next round. Please fill in the required fields.'
          });
        } else if (result.error === 'version-conflict') {
          setBanner({
            type: 'error',
            text: 'Version conflict. Refresh the page to view the latest data.'
          });
        } else if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation no longer exists. Refresh the list to continue.' });
        } else {
          setBanner({ type: 'error', text: 'Failed to create the next round.' });
        }
        return;
      }

      const groupKey = evaluation.candidateId ?? evaluation.id;
      setSelectedRounds((prev) => ({ ...prev, [groupKey]: result.data.id }));
      setBanner({
        type: 'info',
        text: 'Next interview round created. Configure interviewers and send new invites.'
      });
    },
    [saveEvaluation]
  );

  const handleSendInvites = useCallback(
    async (evaluation: EvaluationConfig, mode: 'all' | 'updated') => {
      if (evaluation.processStatus === 'draft' && mode === 'all') {
        const result = await startProcess(evaluation.id);
        if (!result.ok) {
          if (result.error === 'missing-assignment-data') {
            setBanner({
              type: 'error',
              text: 'Assign interviewers, cases, and fit questions to every slot before sending invites.'
            });
            return;
          }
          if (result.error === 'process-already-started') {
            setBanner({ type: 'error', text: 'Invitations for this evaluation have already been sent.' });
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
          setBanner({ type: 'error', text: 'Failed to send invitations to interviewers.' });
          return;
        }
        setBanner({ type: 'info', text: 'Invitations sent. Interviewers received an email notification.' });
        return;
      }

      const result = await resendInvitations(evaluation.id, mode);
      if (!result.ok) {
        if (result.error === 'process-not-started') {
          setBanner({ type: 'error', text: 'Send the initial invites before re-notifying interviewers.' });
          return;
        }
        if (result.error === 'missing-assignment-data') {
          setBanner({
            type: 'error',
            text: 'Complete interviewer, case and fit question assignments before re-sending invites.'
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
        if (result.error === 'no-updates') {
          setBanner({
            type: 'error',
            text: 'There are no interviewer updates since the previous invite.'
          });
          return;
        }
        if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Evaluation not found. Refresh the page.' });
          return;
        }
        setBanner({ type: 'error', text: 'Failed to re-send invitations.' });
        return;
      }
      setBanner({ type: 'info', text: 'Updated invitations sent to interviewers.' });
    },
    [resendInvitations, startProcess]
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    []
  );

  const tableRows = useMemo<EvaluationTableRow[]>(() => {
    return evaluationGroups.map((group) => {
      const selectedId = selectedRounds[group.key] ?? group.defaultEvaluationId;
      const selectedEvaluation =
        group.evaluations.find((item) => item.id === selectedId) ?? group.evaluations[group.evaluations.length - 1];

      const completedForms = selectedEvaluation.forms.filter((form) => form.submitted).length;
      const submittedForms = selectedEvaluation.forms.filter((form) => form.submitted);
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

      const slotsReady = selectedEvaluation.interviews.every((slot) => {
        const nameReady = slot.interviewerName.trim().length > 0;
        const emailReady = slot.interviewerEmail.trim().length > 0;
        const caseReady = Boolean(slot.caseFolderId?.trim());
        const fitReady = Boolean(slot.fitQuestionId?.trim());
        return nameReady && emailReady && caseReady && fitReady;
      });
      const emailsReady = selectedEvaluation.interviews.every((slot) => slot.interviewerEmail.trim().length > 0);

      const processStarted = selectedEvaluation.processStatus !== 'draft';
      const latestInvitationMs = selectedEvaluation.latestInvitationAt
        ? new Date(selectedEvaluation.latestInvitationAt).getTime()
        : null;
      const updatedMs = new Date(selectedEvaluation.updatedAt).getTime();
      const hasPendingUpdates =
        processStarted && (latestInvitationMs == null || (Number.isFinite(updatedMs) && updatedMs > latestInvitationMs));

      let sendInvitesTooltip: string | undefined;
      const sendInvitesMode = processStarted ? 'resend' : 'initial';
      let sendInvitesDisabled = false;

      if (!emailsReady) {
        sendInvitesDisabled = true;
        sendInvitesTooltip = 'Add email addresses for every interviewer before sending invites.';
      } else if (!slotsReady) {
        sendInvitesDisabled = true;
        sendInvitesTooltip = 'Complete all interviewer, case and fit question assignments before sending invites.';
      } else if (sendInvitesMode === 'resend' && !hasPendingUpdates) {
        sendInvitesDisabled = true;
        sendInvitesTooltip = 'No interviewer changes since the last invite.';
      }

      const formsBySlot = new Map(selectedEvaluation.forms.map((form) => [form.slotId, form]));
      const allFormsSubmitted =
        selectedEvaluation.interviews.length > 0 &&
        selectedEvaluation.interviews.every((slot) => formsBySlot.get(slot.id)?.submitted === true);
      const decisionTooltip = allFormsSubmitted
        ? 'All interview feedback is collected. You can decide on the next step.'
        : 'Wait until every interviewer submits their evaluation to enable these actions.';

      const createdAtMsRaw = new Date(selectedEvaluation.createdAt).getTime();
      const createdAtMs = Number.isFinite(createdAtMsRaw) ? createdAtMsRaw : Number.NEGATIVE_INFINITY;
      const createdOn = Number.isFinite(createdAtMsRaw) ? dateFormatter.format(createdAtMsRaw) : '—';

      const roundNumber = selectedEvaluation.roundNumber ?? null;
      const decisionLabel = decisionSelections[selectedEvaluation.id] ?? 'Decision';

      return {
        id: group.key,
        candidateName: group.candidateName,
        candidatePosition: group.candidatePosition,
        roundNumber,
        roundOptions: group.roundOptions,
        selectedRoundId: selectedEvaluation.id,
        onSelectRound: (evaluationId: string) =>
          setSelectedRounds((prev) => ({ ...prev, [group.key]: evaluationId })),
        formsCompleted: completedForms,
        formsPlanned: selectedEvaluation.interviewCount,
        avgFitScore,
        avgCaseScore,
        offerSummary,
        processStatus: selectedEvaluation.processStatus,
        createdOn,
        createdAtValue: createdAtMs,
        sendInvitesMode,
        sendInvitesDisabled,
        sendInvitesTooltip,
        onSendInvites: (mode: 'all' | 'updated') => handleSendInvites(selectedEvaluation, mode),
        decisionDisabled: !allFormsSubmitted,
        decisionTooltip,
        decisionLabel,
        onDecisionSelect: (option) => handleDecisionSelection(selectedEvaluation, option),
        onEdit: () => {
          setModalEvaluation(selectedEvaluation);
          setIsModalOpen(true);
        },
        onOpenStatus: () =>
          setStatusContext({
            evaluation: selectedEvaluation,
            candidateName: group.candidateName,
            candidatePosition: group.candidatePosition,
            roundLabel: roundNumber != null ? `Round ${roundNumber}` : '—'
          })
      };
    });
  }, [dateFormatter, evaluationGroups, handleDecisionSelection, handleSendInvites, selectedRounds, decisionSelections]);

  const sortedRows = useMemo(() => {
    const copy = [...tableRows];

    const compareStrings = (a: string, b: string) => a.localeCompare(b, 'en-US', { sensitivity: 'base' });
    const compareNumbers = (a: number | null | undefined, b: number | null | undefined) => {
      const safeA = typeof a === 'number' && Number.isFinite(a) ? a : Number.NEGATIVE_INFINITY;
      const safeB = typeof b === 'number' && Number.isFinite(b) ? b : Number.NEGATIVE_INFINITY;
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
      } else if (sortKey === 'createdOn') {
        result = compareNumbers(a.createdAtValue, b.createdAtValue);
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
          caseFolders={folders}
          onClose={() => setStatusContext(null)}
        />
      )}
    </section>
  );
};
