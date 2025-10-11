import { useMemo, useState } from 'react';
import styles from '../../styles/FitQuestionsScreen.module.css';
import { useQuestionsState } from '../../app/state/AppStateContext';
import { FitQuestion } from '../../shared/types/fitQuestion';
import { FitQuestionCard } from './components/FitQuestionCard';
import { FitQuestionModal } from './components/FitQuestionModal';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const FitQuestionsScreen = () => {
  const { list, saveQuestion, removeQuestion } = useQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalBanner, setModalBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<FitQuestion | null>(null);

  const sortedQuestions = useMemo(
    () => [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [list]
  );

  const handleCreate = () => {
    setModalQuestion(null);
    setModalBanner(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalQuestion(null);
    setModalBanner(null);
  };

  const handleSave = async (
    question: FitQuestion,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => {
    setModalBanner(null);
    const result = await saveQuestion(question, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setModalBanner({
          type: 'error',
          text: 'Cannot save changes: the question was updated in another session. Refresh the list and try again.'
        });
      } else if (result.error === 'invalid-input') {
        setModalBanner({
          type: 'error',
          text: 'Fill in the short title, content and all criterion titles.'
        });
      } else if (result.error === 'not-found') {
        setModalBanner({
          type: 'error',
          text: 'The question no longer exists. Refresh the list.'
        });
      } else {
        setModalBanner({ type: 'error', text: 'Failed to save the question. Try again later.' });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Fit question saved.' });

    if (options.closeAfterSave) {
      closeModal();
    } else {
      setModalQuestion(result.data);
      setModalBanner({ type: 'info', text: 'Changes saved.' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete the fit question permanently?');
    if (!confirmed) {
      return;
    }
    const result = await removeQuestion(id);
    if (!result.ok) {
      if (result.error === 'not-found') {
        setModalBanner({ type: 'error', text: 'The question was already deleted.' });
      } else {
        setModalBanner({ type: 'error', text: 'Failed to delete the question. Try again.' });
      }
      return;
    }
    setBanner({ type: 'info', text: 'Fit question deleted.' });
    closeModal();
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Fit questions</h1>
          <p className={styles.subtitle}>Создавайте и сохраняйте сценарии вопросов для интервью.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Create question
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {sortedQuestions.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No questions yet</h2>
            <p>Use the “Create question” button to add the first fit question.</p>
          </div>
        ) : (
          sortedQuestions.map((question) => (
            <FitQuestionCard
              key={question.id}
              question={question}
              onOpen={() => {
                setModalQuestion(question);
                setModalBanner(null);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <FitQuestionModal
          initialQuestion={modalQuestion}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          feedback={modalBanner}
          onFeedbackClear={() => setModalBanner(null)}
        />
      )}
    </section>
  );
};
