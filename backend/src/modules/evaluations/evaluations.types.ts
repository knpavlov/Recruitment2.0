import type { CandidateRecord } from '../candidates/candidates.types.js';
import type { CaseFolder } from '../cases/cases.types.js';
import type { FitQuestionRecord } from '../questions/questions.types.js';

export interface InterviewSlotModel {
  id: string;
  interviewerName: string;
  interviewerEmail: string;
  caseFolderId?: string;
  fitQuestionId?: string;
}

export interface InterviewStatusModel {
  slotId: string;
  interviewerName: string;
  submitted: boolean;
  submittedAt?: string;
  notes?: string;
  fitScore?: number;
  caseScore?: number;
  fitNotes?: string;
  caseNotes?: string;
  fitCriteria?: EvaluationCriterionScore[];
  caseCriteria?: EvaluationCriterionScore[];
  interestNotes?: string;
  issuesToTest?: string;
  offerRecommendation?: OfferRecommendationValue;
}

export interface EvaluationCriterionScore {
  criterionId: string;
  score?: number;
}

export type OfferRecommendationValue =
  | 'yes_priority'
  | 'yes_strong'
  | 'yes_keep_warm'
  | 'no_offer';

export type EvaluationProcessStatus = 'draft' | 'in-progress' | 'completed';

export interface InterviewAssignmentModel {
  slotId: string;
  interviewerEmail: string;
  interviewerName: string;
  caseFolderId: string;
  fitQuestionId: string;
}

export interface InterviewAssignmentRecord extends InterviewAssignmentModel {
  id: string;
  evaluationId: string;
  invitationSentAt: string;
  createdAt: string;
}

export interface EvaluationRecord {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlotModel[];
  fitQuestionId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  forms: InterviewStatusModel[];
  processStatus: EvaluationProcessStatus;
  processStartedAt?: string;
  latestInvitationAt?: string;
}

export interface EvaluationWriteModel {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlotModel[];
  fitQuestionId?: string;
  forms: InterviewStatusModel[];
  processStatus?: EvaluationProcessStatus;
}

export interface InterviewerAssignmentView {
  evaluationId: string;
  slotId: string;
  interviewerEmail: string;
  interviewerName: string;
  invitationSentAt: string;
  evaluationUpdatedAt: string;
  evaluationProcessStatus: EvaluationProcessStatus;
  candidate?: CandidateRecord;
  caseFolder?: CaseFolder;
  fitQuestion?: FitQuestionRecord;
  form: InterviewStatusModel | null;
}
