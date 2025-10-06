import { apiRequest } from '../../../shared/api/httpClient';
import { AccountRole } from '../../../shared/types/account';

export interface AuthSessionResponse {
  token: string;
  email: string;
  role: AccountRole;
}

export type RequestCodeResponse =
  | { mode: 'code'; email: string }
  | { mode: 'direct'; session: AuthSessionResponse };

export const authApi = {
  requestCode: async (email: string) =>
    apiRequest<RequestCodeResponse>('/auth/request-code', {
      method: 'POST',
      body: { email }
    }),
  verifyCode: async (email: string, code: string) =>
    apiRequest<AuthSessionResponse>('/auth/verify-code', {
      method: 'POST',
      body: { email, code }
    })
};
