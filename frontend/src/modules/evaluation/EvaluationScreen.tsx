import { useMemo, useState } from 'react';
import styles from '../../styles/EvaluationScreen.module.css';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationCard } from './components/EvaluationCard';
import { EvaluationStatusModal } from './components/EvaluationStatusModal';
import { useEvaluationsState, useCandidatesState, useCasesState } from '../../app/state/AppStateContext';
import { EvaluationConfig } from '../../shared/types/evaluation';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const EvaluationScreen = () => {
  const { list, saveEvaluation, removeEvaluation } = useEvaluationsState();
  const { list: candidates } = useCandidatesState();
  const { folders } = useCasesState();
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
        setBanner({ type: 'error', text: 'Конфликт версий. Обновите страницу, чтобы увидеть актуальные данные.' });
      } else {
        setBanner({ type: 'error', text: 'Укажите кандидата и убедитесь, что все поля заполнены.' });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Настройка оценки сохранена.' });
    if (options.closeAfterSave) {
      setModalEvaluation(null);
      setIsModalOpen(false);
    } else {
      setModalEvaluation(result.data);
    }
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('Удалить настройку оценки и все связанные интервью?');
    if (!confirmed) {
      return;
    }
    const result = removeEvaluation(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Не удалось удалить настройку.' });
      return;
    }
    setBanner({ type: 'info', text: 'Настройка оценки удалена.' });
    setModalEvaluation(null);
    setIsModalOpen(false);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Оценка кандидатов</h1>
          <p className={styles.subtitle}>Настраивайте интервью и отслеживайте статус форм оценок.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Создать новую оценку
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {list.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Нет активных оценок</h2>
            <p>Создайте первую оценку, чтобы назначить интервьюеров и кейсы.</p>
          </div>
        ) : (
      list.map((item) => (
        <EvaluationCard
          key={item.id}
          evaluation={item}
          candidateName={item.candidateId ? candidateNames.get(item.candidateId) ?? 'Не выбран' : 'Не выбран'}
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
        />
      )}

      {statusEvaluation && (
        <EvaluationStatusModal evaluation={statusEvaluation} onClose={() => setStatusEvaluation(null)} />
      )}
    </section>
  );
};
