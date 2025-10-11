import { FitQuestion } from '../../../shared/types/fitQuestion';
import styles from '../../../styles/FitQuestionCard.module.css';

interface FitQuestionCardProps {
  question: FitQuestion;
  onOpen: () => void;
}

export const FitQuestionCard = ({ question, onOpen }: FitQuestionCardProps) => {
  return (
    <button className={styles.card} onClick={onOpen}>
      <h3>{question.shortTitle}</h3>
    </button>
  );
};
