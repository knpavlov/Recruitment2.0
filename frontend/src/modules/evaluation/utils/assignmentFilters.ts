import { InterviewerAssignmentView } from '../../../shared/types/evaluation';

const DAYS_TO_KEEP = 90;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const parseTimestamp = (value: string | undefined | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveReferenceTime = (assignment: InterviewerAssignmentView): number | null => {
  const updatedAt = parseTimestamp(assignment.evaluationUpdatedAt);
  if (updatedAt != null) {
    return updatedAt;
  }
  return parseTimestamp(assignment.invitationSentAt ?? undefined);
};

/**
 * Фильтруем устаревшие карточки интервьюеров, чтобы скрывать их из списка.
 */
export const filterActiveAssignments = (
  assignments: InterviewerAssignmentView[],
  referenceDate: Date = new Date()
): InterviewerAssignmentView[] => {
  const cutoff = referenceDate.getTime() - DAYS_TO_KEEP * MS_IN_DAY;
  return assignments.filter((assignment) => {
    const timestamp = resolveReferenceTime(assignment);
    if (timestamp == null) {
      return true;
    }
    return timestamp >= cutoff;
  });
};
