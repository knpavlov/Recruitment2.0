import { CandidateProfile } from './candidate';
import { CaseFolder } from './caseLibrary';
import { FitQuestion } from './fitQuestion';

export type EvaluationStatus = 'draft' | 'in-progress' | 'completed';

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
  interviewerEmail: string;
  submitted: boolean;
  submittedAt?: string;
  fitScore?: number;
  caseScore?: number;
  notes?: string;
}

export interface EvaluationConfig {
  id: string;
  candidateId?: string;
  roundNumber?: number;
  interviewCount: number;
  interviews: InterviewSlot[];
  fitQuestionId?: string;
  status: EvaluationStatus;
  processStartedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  forms: InterviewStatusRecord[];
}

export interface InterviewerAssignment {
  evaluationId: string;
  slotId: string;
  interviewerName: string;
  interviewerEmail: string;
  evaluationStatus: EvaluationStatus;
  evaluationVersion: number;
  roundNumber?: number;
  processStartedAt?: string;
  candidate: CandidateProfile;
  caseFolder?: CaseFolder;
  fitQuestion?: FitQuestion;
  form: InterviewStatusRecord;
}
