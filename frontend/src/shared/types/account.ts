export type AccountRole = 'super-admin' | 'admin' | 'user';
export type AccountStatus = 'pending' | 'active';
export type InterviewerSeniority = 'MD' | 'SD' | 'D' | 'SM' | 'M' | 'SA' | 'A';

export interface AccountRecord {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  name?: string;
  firstName?: string;
  lastName?: string;
  interviewerRole?: InterviewerSeniority | null;
  invitedAt: string;
  activatedAt?: string;
  invitationToken: string;
}
