export type EvaluationStatus = 'draft' | 'in-progress' | 'completed';

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
  interviewerEmail: string;
  submitted: boolean;
  submittedAt?: string;
  fitScore?: number;
  caseScore?: number;
  notes?: string;
}

export interface EvaluationRecord {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlotModel[];
  fitQuestionId?: string;
  status: EvaluationStatus;
  processStartedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  forms: InterviewStatusModel[];
}

export interface EvaluationWriteModel {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlotModel[];
  fitQuestionId?: string;
  status: EvaluationStatus;
  processStartedAt?: string;
  forms: InterviewStatusModel[];
}

