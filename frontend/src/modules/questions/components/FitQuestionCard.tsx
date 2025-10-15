import { FitQuestion } from '../../../shared/types/fitQuestion';
import styles from '../../../styles/FitQuestionCard.module.css';
import { formatAustralianDate } from '../../../shared/utils/dateFormat';

interface FitQuestionCardProps {
  question: FitQuestion;
  onOpen: () => void;
}

export const FitQuestionCard = ({ question, onOpen }: FitQuestionCardProps) => {
  // Форматируем дату обновления для карточки
  const formatted = formatAustralianDate(question.updatedAt);

  return (
    <button className={styles.card} onClick={onOpen}>
      <h3>{question.shortTitle}</h3>
      <p className={styles.updated}>Last update: {formatted}</p>
    </button>
  );
};
