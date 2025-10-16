export type AccountRole = 'super-admin' | 'admin' | 'user';
export type AccountStatus = 'pending' | 'active';

export interface AccountRecord {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  firstName?: string;
  lastName?: string;
  name?: string;
  invitedAt: string;
  activatedAt?: string;
  invitationToken: string;
}
