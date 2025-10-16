export type AccountRole = 'super-admin' | 'admin' | 'user';
export type AccountStatus = 'pending' | 'active';

export interface AccountRecord {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  name?: string;
  firstName?: string;
  lastName?: string;
  invitedAt: string;
  activatedAt?: string;
  invitationToken: string;
}
