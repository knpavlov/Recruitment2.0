export interface InterviewSlot {
  id: string;
  interviewerName: string;
  interviewerEmail: string;
  caseFolderId?: string;
  fitQuestionId?: string;
}

export type OfferRecommendation = 'yes-priority' | 'yes-strong' | 'yes-keep-warm' | 'no';

export const OFFER_RECOMMENDATION_OPTIONS: OfferRecommendation[] = [
  'yes-priority',
  'yes-strong',
  'yes-keep-warm',
  'no'
];

export const OFFER_RECOMMENDATION_LABELS: Record<OfferRecommendation, string> = {
  'yes-priority': 'Yes, priority',
  'yes-strong': 'Yes, strong hire',
  'yes-keep-warm': 'Yes, keep warm',
  no: 'No offer'
};

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
  fitCriteria?: Record<string, number>;
  caseCriteria?: Record<string, number>;
  interestLevel?: string;
  issuesToTest?: string;
  summary?: string;
  offerRecommendation?: OfferRecommendation;
  offerRecommendationNotes?: string;
}

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
