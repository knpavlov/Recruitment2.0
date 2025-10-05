import { AccountRole } from './account';

export interface AuthSession {
  token: string;
  email: string;
  role: AccountRole;
  expiresAt: string;
  rememberMe: boolean;
}
