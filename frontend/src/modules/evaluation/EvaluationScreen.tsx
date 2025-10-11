import { useMemo, useState } from 'react';
import styles from '../../styles/EvaluationScreen.module.css';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationCard } from './components/EvaluationCard';
import { EvaluationStatusModal } from './components/EvaluationStatusModal';
import {
  useEvaluationsState,
  useCandidatesState,
  useCasesState,
  useQuestionsState
} from '../../app/state/AppStateContext';
import { EvaluationConfig } from '../../shared/types/evaluation';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
  const { list: questions } = useQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalEvaluation, setModalEvaluation] = useState<EvaluationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusEvaluation, setStatusEvaluation] = useState<EvaluationConfig | null>(null);

  const candidateNames = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach((candidate) => {
      map.set(candidate.id, `${candidate.lastName} ${candidate.firstName}`.trim());
    });
    return map;
  }, [candidates]);

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
        <button className={styles.primaryButton} onClick={handleCreate}>
          Create evaluation
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {list.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No evaluations yet</h2>
            <p>Create your first evaluation to assign interviewers and cases.</p>
          </div>
        ) : (
      list.map((item) => (
        <EvaluationCard
          key={item.id}
          evaluation={item}
          candidateName={item.candidateId ? candidateNames.get(item.candidateId) ?? 'Not selected' : 'Not selected'}
          onEdit={() => {
            setModalEvaluation(item);
            setIsModalOpen(true);
          }}
          onOpenStatus={() => setStatusEvaluation(item)}
        />
      ))
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
          questions={questions}
        />
      )}

      {statusEvaluation && (
        <EvaluationStatusModal evaluation={statusEvaluation} onClose={() => setStatusEvaluation(null)} />
      )}
    </section>
  );
};
