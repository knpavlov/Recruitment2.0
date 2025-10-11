import { useMemo, useState } from 'react';
import styles from '../../styles/FitQuestionsScreen.module.css';
import { useQuestionsState } from '../../app/state/AppStateContext';
import { FitQuestion } from '../../shared/types/fitQuestion';
import { FitQuestionModal } from './components/FitQuestionModal';
import { FitQuestionCard } from './components/FitQuestionCard';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const FitQuestionsScreen = () => {
  const { list, saveQuestion, removeQuestion } = useQuestionsState();
  const [banner, setBanner] = useState<Banner>(null);
  const [modalBanner, setModalBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<FitQuestion | null>(null);

  const sortedQuestions = useMemo(
    () =>
      [...list].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
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
          text: 'Не удалось сохранить: вопрос был изменён в другой сессии. Обновите список и повторите попытку.'
        });
        return;
      }
      if (result.error === 'invalid-input') {
        setModalBanner({
          type: 'error',
          text: 'Заполните название, содержание и названия критериев, затем попробуйте снова.'
        });
        return;
      }
      if (result.error === 'not-found') {
        setModalBanner({
          type: 'error',
          text: 'Вопрос не найден. Обновите список и попробуйте снова.'
        });
        return;
      }
      setModalBanner({
        type: 'error',
        text: 'Не удалось сохранить изменения. Попробуйте ещё раз.'
      });
      return;
    }

    setBanner({ type: 'info', text: 'Фит-вопрос сохранён.' });

    if (options.closeAfterSave) {
      closeModal();
    } else {
      setModalQuestion(result.data);
      setModalBanner({ type: 'info', text: 'Изменения сохранены.' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Удалить вопрос без возможности восстановления?');
    if (!confirmed) {
      return;
    }
    const result = await removeQuestion(id);
    if (!result.ok) {
      if (result.error === 'not-found') {
        setBanner({ type: 'error', text: 'Вопрос уже был удалён.' });
        return;
      }
      setBanner({ type: 'error', text: 'Не удалось удалить вопрос. Попробуйте ещё раз.' });
      return;
    }
    setBanner({ type: 'info', text: 'Вопрос удалён.' });
    closeModal();
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Fit questions</h1>
          <p className={styles.subtitle}>Создавайте и настраивайте вопросы для культурных интервью.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Создать вопрос
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {sortedQuestions.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Вопросов пока нет</h2>
            <p>Нажмите «Создать вопрос», чтобы добавить первый фит-вопрос.</p>
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
