import { InterviewerAssignment } from '../../../shared/types/evaluation';
import styles from '../../../styles/InterviewerPortal.module.css';

interface AssignmentListProps {
  assignments: InterviewerAssignment[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export const buildAssignmentKey = (assignment: InterviewerAssignment) => `${assignment.evaluationId}:${assignment.slotId}`;

const buildCandidateName = (assignment: InterviewerAssignment) => {
  const { firstName, lastName } = assignment.candidate;
  const fullName = `${lastName ?? ''} ${firstName ?? ''}`.trim();
  return fullName || assignment.candidate.email || 'Кандидат';
};

const buildStatusLabel = (assignment: InterviewerAssignment) => {
  if (assignment.form.submitted) {
    return 'Отправлено';
  }
  if (assignment.evaluationStatus === 'draft') {
    return 'Ожидает запуска';
  }
  if (assignment.evaluationStatus === 'in-progress') {
    return 'В работе';
  }
  return 'Завершено';
};

export const AssignmentList = ({ assignments, selectedKey, onSelect }: AssignmentListProps) => {
  if (assignments.length === 0) {
    return (
      <div className={styles.listEmpty}>У вас пока нет назначенных интервью. Проверьте почту позже.</div>
    );
  }

  return (
    <ul className={styles.assignmentList}>
      {assignments.map((assignment) => {
        const key = buildAssignmentKey(assignment);
        const isActive = key === selectedKey;
        const candidateName = buildCandidateName(assignment);
        const statusLabel = buildStatusLabel(assignment);
        const roundLabel = assignment.roundNumber ? `Раунд ${assignment.roundNumber}` : 'Без раунда';
        return (
          <li key={key}>
            <button
              type="button"
              className={`${styles.assignmentButton} ${isActive ? styles.assignmentButtonActive : ''}`}
              onClick={() => onSelect(key)}
            >
              <div className={styles.assignmentTitle}>{candidateName}</div>
              <div className={styles.assignmentMeta}>
                <span className={`${styles.statusTag} ${assignment.form.submitted ? styles.statusTagSubmitted : ''}`}>
                  {statusLabel}
                </span>
                <span>{roundLabel}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
