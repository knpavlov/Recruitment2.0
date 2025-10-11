import { InterviewSlot, InterviewStatusRecord } from './evaluation';
import { CandidateProfile } from './candidate';
import { CaseFolder } from './caseLibrary';
import { FitQuestion } from './fitQuestion';

export interface InterviewAssignment {
  evaluationId: string;
  candidateId?: string;
  roundNumber?: number;
  processStatus: 'draft' | 'active' | 'completed';
  processStartedAt?: string;
  updatedAt: string;
  interview: InterviewSlot;
  form: InterviewStatusRecord;
  candidate?: CandidateProfile;
  caseFolder?: CaseFolder;
  fitQuestion?: FitQuestion;
}
