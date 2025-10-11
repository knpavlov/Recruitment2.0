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
}

export interface EvaluationWriteModel {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlotModel[];
  fitQuestionId?: string;
  forms: InterviewStatusModel[];
}
