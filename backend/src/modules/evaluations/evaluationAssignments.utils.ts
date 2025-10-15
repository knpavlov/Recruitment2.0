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
  const assignmentBySlot = new Map(matchingAssignments.map((assignment) => [assignment.slotId, assignment]));
  const hasInvitations = matchingAssignments.length > 0;

  const slotStates = evaluation.interviews.map((slot) => {
    const assignment = assignmentBySlot.get(slot.id) ?? null;
    const sameEmail = assignment
      ? normalize(slot.interviewerEmail) === normalize(assignment.interviewerEmail)
      : false;
    const sameCase = (slot.caseFolderId ?? '') === (assignment?.caseFolderId ?? '');
    const sameQuestion = (slot.fitQuestionId ?? '') === (assignment?.fitQuestionId ?? '');
    const slotName = (slot.interviewerName ?? '').trim();
    const assignmentName = (assignment?.interviewerName ?? '').trim();
    const sameName = slotName === assignmentName;
    const hasPendingChanges = !assignment || !sameEmail || !sameCase || !sameQuestion || !sameName;
    return {
      slotId: slot.id,
      interviewerName: slot.interviewerName,
      interviewerEmail: slot.interviewerEmail,
      lastSentAt: assignment?.invitationSentAt ?? undefined,
      hasPendingChanges
    };
  });

  const hasPendingChanges =
    !hasInvitations ||
    slotStates.some((slot) => slot.hasPendingChanges) ||
    currentAssignments.some((assignment) => !slotMap.has(assignment.slotId));

  const lastSentAt = matchingAssignments.length
    ? matchingAssignments
        .map((item) => new Date(item.invitationSentAt).getTime())
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => b - a)[0]
    : undefined;

  return {
    hasInvitations,
    hasPendingChanges,
    lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : undefined,
    slots: slotStates
  };
};
