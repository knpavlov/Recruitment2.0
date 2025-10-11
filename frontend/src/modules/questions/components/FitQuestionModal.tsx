import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/FitQuestionModal.module.css';
import { FitQuestion, FitQuestionCriterion } from '../../../shared/types/fitQuestion';
import { generateId } from '../../../shared/ui/generateId';

interface FitQuestionModalProps {
  initialQuestion: FitQuestion | null;
  onSave: (
    question: FitQuestion,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  feedback: { type: 'info' | 'error'; text: string } | null;
  onFeedbackClear: () => void;
}

const createEmptyCriterion = (questionId: string, position: number): FitQuestionCriterion => ({
  id: generateId(),
  questionId,
  name: '',
  position,
  score1: undefined,
  score2: undefined,
  score3: undefined,
  score4: undefined,
  score5: undefined
});

const createEmptyQuestion = (): FitQuestion => {
  const id = generateId();
  return {
    id,
    version: 1,
    shortTitle: '',
    content: '',
    criteria: [createEmptyCriterion(id, 0)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const FitQuestionModal = ({
  initialQuestion,
  onSave,
  onDelete,
  onClose,
  feedback,
  onFeedbackClear
}: FitQuestionModalProps) => {
  const [question, setQuestion] = useState<FitQuestion>(createEmptyQuestion());

  useEffect(() => {
    if (initialQuestion) {
      setQuestion({
        ...initialQuestion,
        criteria: initialQuestion.criteria.map((item, index) => ({
          ...item,
          position: index
        }))
      });
    } else {
      setQuestion(createEmptyQuestion());
    }
  }, [initialQuestion]);

  const expectedVersion = initialQuestion ? initialQuestion.version : null;

  const criteria = useMemo(
    () =>
      question.criteria.map((item, index) => ({
        ...item,
        position: index,
        questionId: question.id
      })),
    [question]
  );

  const updateQuestion = (patch: Partial<FitQuestion>) => {
    setQuestion((prev) => ({ ...prev, ...patch }));
  };

  const updateCriterion = (id: string, patch: Partial<FitQuestionCriterion>) => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: prev.criteria.map((item, index) =>
        item.id === id ? { ...item, ...patch, position: index, questionId: prev.id } : { ...item, position: index, questionId: prev.id }
      )
    }));
  };

  const addCriterion = () => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: [...prev.criteria, createEmptyCriterion(prev.id, prev.criteria.length)]
    }));
  };

  const removeCriterion = (id: string) => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((item) => item.id !== id).map((item, index) => ({
        ...item,
        position: index,
        questionId: prev.id
      }))
    }));
  };

  const submit = (closeAfterSave: boolean) => {
    onFeedbackClear();
    const payload: FitQuestion = {
      ...question,
      criteria: criteria
    };
    void onSave(payload, { closeAfterSave, expectedVersion });
  };

  const handleDelete = () => {
    if (!initialQuestion) {
      onClose();
      return;
    }
    onFeedbackClear();
    void onDelete(initialQuestion.id);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>{initialQuestion ? 'Редактирование фит-вопроса' : 'Новый фит-вопрос'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть окно">
            ×
          </button>
        </header>

        {feedback && (
          <div
            className={feedback.type === 'info' ? styles.feedbackInfo : styles.feedbackError}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </div>
        )}

        <div className={styles.content}>
          <label className={styles.field}>
            <span>Короткое название</span>
            <input
              value={question.shortTitle}
              onChange={(event) => {
                onFeedbackClear();
                updateQuestion({ shortTitle: event.target.value });
              }}
              placeholder="Например, «Командная работа»"
            />
          </label>

          <label className={styles.field}>
            <span>Содержание вопроса</span>
            <textarea
              value={question.content}
              onChange={(event) => {
                onFeedbackClear();
                updateQuestion({ content: event.target.value });
              }}
              rows={6}
              placeholder="Опишите полный текст вопроса для интервьюера"
            />
          </label>

          <section className={styles.criteriaSection}>
            <div className={styles.criteriaHeader}>
              <h3>Критерии оценки</h3>
              <button type="button" className={styles.secondaryButton} onClick={addCriterion}>
                Добавить критерий
              </button>
            </div>

            {criteria.length === 0 ? (
              <p className={styles.emptyCriteria}>Добавьте хотя бы один критерий оценки.</p>
            ) : (
              criteria.map((item, index) => (
                <div key={item.id} className={styles.criterionCard}>
                  <div className={styles.criterionHeader}>
                    <h4>Критерий {index + 1}</h4>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeCriterion(item.id)}
                    >
                      Удалить
                    </button>
                  </div>

                  <label className={styles.field}>
                    <span>Название критерия</span>
                    <input
                      value={item.name}
                      onChange={(event) => updateCriterion(item.id, { name: event.target.value })}
                      placeholder="Например, «Структура ответа»"
                    />
                  </label>

                  <div className={styles.scoresGrid}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <label key={score} className={styles.scoreField}>
                        <span>Оценка {score}</span>
                        <textarea
                          value={item[`score${score}` as keyof FitQuestionCriterion] ?? ''}
                          onChange={(event) =>
                            updateCriterion(item.id, {
                              [`score${score}`]: event.target.value || undefined
                            } as Partial<FitQuestionCriterion>)
                          }
                          rows={3}
                          placeholder="Описание оценки"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostButton} onClick={onClose}>
            Отменить
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleDelete}
            disabled={!initialQuestion}
          >
            Удалить вопрос
          </button>
          <div className={styles.footerActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => submit(false)}>
              Сохранить
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => submit(true)}>
              Сохранить и закрыть
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
