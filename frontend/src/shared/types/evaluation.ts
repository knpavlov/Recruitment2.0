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
  fitCriteria: InterviewCriterionScore[];
  caseCriteria: InterviewCriterionScore[];
  interestLevel?: string;
  issuesToTest?: string;
  overallImpression?: OverallImpression;
  offerRecommendation?: OfferRecommendation;
  followUpPlan?: string;
}

export interface InterviewCriterionScore {
  criterionId: string;
  score?: number;
  notes?: string;
}

export type OfferRecommendation = 'yes-priority' | 'yes' | 'hold' | 'no';

export type OverallImpression = 'top-choice' | 'strong' | 'mixed' | 'concerns';

export type EvaluationProcessStatus = 'draft' | 'in-progress' | 'completed';

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
