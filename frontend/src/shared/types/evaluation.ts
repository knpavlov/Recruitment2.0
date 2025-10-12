export interface InterviewSlot {
  id: string;
  interviewerName: string;
  interviewerEmail: string;
  caseFolderId?: string;
  fitQuestionId?: string;
}

export interface InterviewStatusRecord {
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

export type EvaluationProcessStatus = 'draft' | 'in-progress' | 'completed';

export interface EvaluationCriterionScore {
  criterionId: string;
  score?: number;
}

export type OfferRecommendationValue =
  | 'yes_priority'
  | 'yes_strong'
  | 'yes_keep_warm'
  | 'no_offer';

export interface EvaluationConfig {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlot[];
  fitQuestionId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  forms: InterviewStatusRecord[];
  processStatus: EvaluationProcessStatus;
  processStartedAt?: string;
}

export interface InterviewerAssignmentView {
  evaluationId: string;
  slotId: string;
  interviewerEmail: string;
  interviewerName: string;
  invitationSentAt: string;
  evaluationUpdatedAt: string;
  evaluationProcessStatus: EvaluationProcessStatus;
  candidate?: import('./candidate').CandidateProfile;
  caseFolder?: import('./caseLibrary').CaseFolder;
  fitQuestion?: import('./fitQuestion').FitQuestion;
  form: InterviewStatusRecord | null;
}
