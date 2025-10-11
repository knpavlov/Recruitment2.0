import { useEffect, useMemo, useState } from 'react';
import {
  FitQuestion,
  FitQuestionCriterion,
  FitQuestionRatingKey
} from '../../../shared/types/fitQuestion';
import styles from '../../../styles/FitQuestionModal.module.css';
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

const createEmptyQuestion = (): FitQuestion => ({
  id: generateId(),
  version: 1,
  shortTitle: '',
  content: '',
  criteria: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const SCORE_KEYS: FitQuestionRatingKey[] = ['1', '2', '3', '4', '5'];

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
      setQuestion(initialQuestion);
    } else {
      setQuestion(createEmptyQuestion());
    }
  }, [initialQuestion]);

  const expectedVersion = initialQuestion ? initialQuestion.version : null;

  const hasEmptyCriterion = useMemo(
    () => question.criteria.some((criterion) => !criterion.title.trim()),
    [question.criteria]
  );

  const isValid = Boolean(question.shortTitle.trim() && question.content.trim() && !hasEmptyCriterion);

  const handleFieldChange = (field: keyof FitQuestion, value: string) => {
    onFeedbackClear();
    setQuestion((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCriterion = () => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          id: generateId(),
          title: '',
          ratings: {}
        }
      ]
    }));
  };

  const handleUpdateCriterion = (
    id: string,
    updater: (current: FitQuestionCriterion) => FitQuestionCriterion
  ) => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: prev.criteria.map((item) => (item.id === id ? updater(item) : item))
    }));
  };

  const handleRemoveCriterion = (id: string) => {
    onFeedbackClear();
    setQuestion((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((item) => item.id !== id)
    }));
  };

  const submitSave = (closeAfterSave: boolean) => {
    const trimmedCriteria = question.criteria.map((criterion) => {
      const ratings: FitQuestionCriterion['ratings'] = {};
      for (const score of SCORE_KEYS) {
        const description = criterion.ratings[score];
        if (typeof description === 'string' && description.trim()) {
          ratings[score] = description.trim();
        }
      }
      return {
        ...criterion,
        title: criterion.title.trim(),
        ratings
      };
    });
    const trimmedQuestion: FitQuestion = {
      ...question,
      shortTitle: question.shortTitle.trim(),
      content: question.content.trim(),
      criteria: trimmedCriteria
    };
    setQuestion(trimmedQuestion);
    void onSave(trimmedQuestion, { closeAfterSave, expectedVersion });
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
          <div>
            <h2>{initialQuestion ? 'Edit fit question' : 'New fit question'}</h2>
            <p className={styles.subtitle}>Настройте содержание вопроса и шкалы оценок.</p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
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

        <div className={styles.body}>
          <label className={styles.field}>
            <span>Short title</span>
            <input
              value={question.shortTitle}
              onChange={(event) => handleFieldChange('shortTitle', event.target.value)}
              placeholder="Short internal label"
            />
          </label>

          <label className={styles.field}>
            <span>Question content</span>
            <textarea
              value={question.content}
              onChange={(event) => handleFieldChange('content', event.target.value)}
              placeholder="Full question text for the interviewer"
              rows={5}
            />
          </label>

          <section className={styles.criteriaSection}>
            <div className={styles.criteriaHeader}>
              <h3>Evaluation criteria</h3>
              <button type="button" className={styles.addButton} onClick={handleAddCriterion}>
                Add criterion
              </button>
            </div>

            {question.criteria.length === 0 ? (
              <p className={styles.criteriaHint}>Добавьте критерии, чтобы описать шкалу оценок.</p>
            ) : (
              question.criteria.map((criterion, index) => (
                <div key={criterion.id} className={styles.criterionCard}>
                  <div className={styles.criterionHeader}>
                    <h4>Criterion {index + 1}</h4>
                    <button
                      type="button"
                      className={styles.removeCriterion}
                      onClick={() => handleRemoveCriterion(criterion.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <label className={styles.field}>
                    <span>Criterion title</span>
                    <input
                      value={criterion.title}
                      onChange={(event) =>
                        handleUpdateCriterion(criterion.id, (current) => ({
                          ...current,
                          title: event.target.value
                        }))
                      }
                      placeholder="What are we evaluating?"
                    />
                  </label>

                  <div className={styles.ratingsGrid}>
                    {SCORE_KEYS.map((score) => (
                      <label key={score} className={styles.ratingField}>
                        <span>Score {score}</span>
                        <textarea
                          value={criterion.ratings[score] ?? ''}
                          onChange={(event) =>
                            handleUpdateCriterion(criterion.id, (current) => ({
                              ...current,
                              ratings: {
                                ...current.ratings,
                                [score]: event.target.value
                              }
                            }))
                          }
                          placeholder="Описание оценки"
                          rows={2}
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
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleDelete}
            disabled={!initialQuestion}
          >
            Delete question
          </button>
          <div className={styles.footerGap} />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => submitSave(false)}
            disabled={!isValid}
          >
            Save
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => submitSave(true)}
            disabled={!isValid}
          >
            Save & close
          </button>
        </footer>
      </div>
    </div>
  );
};
