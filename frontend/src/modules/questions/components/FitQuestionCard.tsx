import styles from '../../../styles/FitQuestionCard.module.css';
import { FitQuestion } from '../../../shared/types/fitQuestion';

interface FitQuestionCardProps {
  question: FitQuestion;
  onOpen: () => void;
}

export const FitQuestionCard = ({ question, onOpen }: FitQuestionCardProps) => {
  const updatedAt = new Date(question.updatedAt);
  const formatted = Number.isNaN(updatedAt.getTime())
    ? ''
    : updatedAt.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <h3>{question.shortTitle}</h3>
      {formatted && <p className={styles.updated}>Обновлено {formatted}</p>}
    </button>
  );
};
