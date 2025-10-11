import { useMemo, useState } from 'react';
import styles from '../../styles/EvaluationScreen.module.css';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationTable, EvaluationTableRow } from './components/EvaluationTable';
import { EvaluationStatusModal } from './components/EvaluationStatusModal';
import {
  useEvaluationsState,
  useCandidatesState,
  useCasesState,
  useFitQuestionsState
} from '../../app/state/AppStateContext';
import { EvaluationConfig } from '../../shared/types/evaluation';

type SortMode = 'name' | 'position' | 'round' | 'fit' | 'case';
type SortDirection = 'asc' | 'desc';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
  const { list: fitQuestions } = useFitQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalEvaluation, setModalEvaluation] = useState<EvaluationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusEvaluation, setStatusEvaluation] = useState<EvaluationConfig | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const candidateNames = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach((candidate) => {
      map.set(candidate.id, `${candidate.lastName} ${candidate.firstName}`.trim());
    });
    return map;
  }, [candidates]);

  const candidatePositions = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach((candidate) => {
      map.set(candidate.id, candidate.desiredPosition?.trim() ?? 'Position not specified');
    });
    return map;
  }, [candidates]);

  const evaluationRows = useMemo<EvaluationTableRow[]>(() => {
    return list.map((item) => {
      const candidateName = item.candidateId
        ? candidateNames.get(item.candidateId) || 'Not selected'
        : 'Not selected';
      const candidatePosition = item.candidateId
        ? candidatePositions.get(item.candidateId) || 'Position not specified'
        : 'Position not specified';
      const formsTotal = item.forms.length;
      const formsCompleted = item.forms.filter((form) => form.submitted).length;

      return {
        id: item.id,
        candidateName,
        candidatePosition,
        roundNumber: item.roundNumber,
        formsCompleted,
        formsTotal,
        averageFitScore: null,
        averageCaseScore: null
      };
    });
  }, [candidateNames, candidatePositions, list]);

  const sortedRows = useMemo(() => {
    const copy = [...evaluationRows];

    copy.sort((a, b) => {
      const applyDirection = (value: number) => (sortDirection === 'asc' ? value : -value);
      const compareNullableNumbers = (valueA: number | null, valueB: number | null) => {
        if (valueA === null && valueB === null) {
          return 0;
        }
        if (valueA === null) {
          return 1;
        }
        if (valueB === null) {
          return -1;
        }
        const diff = valueA - valueB;
        if (diff === 0) {
          return 0;
        }
        return applyDirection(diff);
      };

      if (sortMode === 'name') {
        const diff = a.candidateName.localeCompare(b.candidateName, 'en-US', {
          sensitivity: 'base'
        });
        return applyDirection(diff);
      }

      if (sortMode === 'position') {
        const diff = a.candidatePosition.localeCompare(b.candidatePosition, 'en-US', {
          sensitivity: 'base'
        });
        return applyDirection(diff);
      }

      if (sortMode === 'round') {
        const roundA = typeof a.roundNumber === 'number' ? a.roundNumber : null;
        const roundB = typeof b.roundNumber === 'number' ? b.roundNumber : null;
        return compareNullableNumbers(roundA, roundB);
      }

      if (sortMode === 'fit') {
        const fitA = typeof a.averageFitScore === 'number' ? a.averageFitScore : null;
        const fitB = typeof b.averageFitScore === 'number' ? b.averageFitScore : null;
        return compareNullableNumbers(fitA, fitB);
      }

      const caseA = typeof a.averageCaseScore === 'number' ? a.averageCaseScore : null;
      const caseB = typeof b.averageCaseScore === 'number' ? b.averageCaseScore : null;
      return compareNullableNumbers(caseA, caseB);
    });

    return copy;
  }, [evaluationRows, sortDirection, sortMode]);

  const handleCreate = () => {
    setModalEvaluation(null);
    setIsModalOpen(true);
  };

  const handleSave = (evaluation: EvaluationConfig, options: { closeAfterSave: boolean; expectedVersion: number | null }) => {
    const result = saveEvaluation(evaluation, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setBanner({
          type: 'error',
          text: 'Version conflict. Refresh the page to view the latest data.'
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

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('Delete the evaluation setup and all related interviews?');
    if (!confirmed) {
      return;
    }
    const result = removeEvaluation(id);
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
        <div className={styles.actions}>
          <label className={styles.sortControl}>
            <span>Sort by</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="name">Candidate name</option>
              <option value="position">Desired position</option>
              <option value="round">Round</option>
              <option value="fit">Avg fit score</option>
              <option value="case">Avg case score</option>
            </select>
          </label>
          <button
            className={styles.sortToggle}
            onClick={() => setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}
            type="button"
          >
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
          <button className={styles.primaryButton} onClick={handleCreate}>
            Create evaluation
          </button>
        </div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.contentArea}>
        {sortedRows.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No evaluations yet</h2>
            <p>Create your first evaluation to assign interviewers and cases.</p>
          </div>
        ) : (
          <EvaluationTable
            rows={sortedRows}
            onEdit={(id) => {
              const current = list.find((item) => item.id === id);
              if (current) {
                setModalEvaluation(current);
                setIsModalOpen(true);
              }
            }}
            onOpenStatus={(id) => {
              const current = list.find((item) => item.id === id);
              if (current) {
                setStatusEvaluation(current);
              }
            }}
          />
        )}
      </div>

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
