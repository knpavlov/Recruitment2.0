import {
  EvaluationInvitationState,
  EvaluationRecord,
  InterviewAssignmentRecord
} from './evaluations.types.js';

const normalize = (value: string | undefined) => (value ?? '').trim().toLowerCase();

export const computeInvitationState = (
  evaluation: EvaluationRecord,
  assignments: InterviewAssignmentRecord[]
): EvaluationInvitationState => {
  const currentRound = evaluation.roundNumber ?? 1;
  const currentAssignments = assignments.filter(
    (assignment) => assignment.roundNumber === currentRound
  );
  const slotMap = new Map(evaluation.interviews.map((slot) => [slot.id, slot]));
  const matchingAssignments = currentAssignments.filter((assignment) => slotMap.has(assignment.slotId));
  const hasInvitations = matchingAssignments.length > 0;

  let hasPendingChanges = false;

  if (!hasInvitations) {
    hasPendingChanges = true;
  }

  if (!hasPendingChanges) {
    for (const [slotId, slot] of slotMap.entries()) {
      const assignment = matchingAssignments.find((item) => item.slotId === slotId);
      if (!assignment) {
        hasPendingChanges = true;
        break;
      }
      if (normalize(slot.interviewerEmail) !== normalize(assignment.interviewerEmail)) {
        hasPendingChanges = true;
        break;
      }
      const slotCase = slot.caseFolderId ?? '';
      const assignmentCase = assignment.caseFolderId ?? '';
      if (slotCase !== assignmentCase) {
        hasPendingChanges = true;
        break;
      }
      const slotFit = slot.fitQuestionId ?? '';
      const assignmentFit = assignment.fitQuestionId ?? '';
      if (slotFit !== assignmentFit) {
        hasPendingChanges = true;
        break;
      }
      const slotName = (slot.interviewerName ?? '').trim();
      const assignmentName = (assignment.interviewerName ?? '').trim();
      if (slotName !== assignmentName) {
        hasPendingChanges = true;
        break;
      }
    }
  }

  if (!hasPendingChanges) {
    const currentSlotIds = new Set(slotMap.keys());
    if (currentAssignments.some((assignment) => !currentSlotIds.has(assignment.slotId))) {
      hasPendingChanges = true;
    }
  }

  const lastSentAt = matchingAssignments.length
    ? matchingAssignments
        .map((item) => new Date(item.invitationSentAt).getTime())
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => b - a)[0]
    : undefined;

  return {
    hasInvitations,
    hasPendingChanges,
    lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : undefined
  };
};
