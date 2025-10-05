import { apiRequest, ApiError } from '../../../shared/api/httpClient';
import { AuthSession } from '../../../shared/types/auth';

type RequestCodeApiResult = { ok: true } | { ok: false; error: 'not-found' | 'unknown' };
type VerifyCodeApiResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: 'invalid' | 'expired' | 'unknown' };
type LoadSessionApiResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: 'unauthorized' | 'unknown' };
type LogoutApiResult = { ok: true } | { ok: false; error: 'unknown' };

export const authApi = {
  async requestCode(email: string): Promise<RequestCodeApiResult> {
    try {
      await apiRequest<{ email: string }>('/auth/request-code', {
        method: 'POST',
        body: { email }
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { ok: false, error: 'not-found' };
      }
      console.error('Failed to request access code:', error);
      return { ok: false, error: 'unknown' };
    }
  },

  async verifyCode(email: string, code: string, rememberMe: boolean): Promise<VerifyCodeApiResult> {
    try {
      const session = await apiRequest<AuthSession>('/auth/verify-code', {
        method: 'POST',
        body: { email, code, rememberMe }
      });
      return { ok: true, session };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 410) {
          return { ok: false, error: 'expired' };
        }
        if (error.status === 401) {
          return { ok: false, error: 'invalid' };
        }
      }
      console.error('Failed to verify access code:', error);
      return { ok: false, error: 'unknown' };
    }
  },

  async loadSession(): Promise<LoadSessionApiResult> {
    try {
      const session = await apiRequest<AuthSession>('/auth/session');
      return { ok: true, session };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return { ok: false, error: 'unauthorized' };
      }
      console.error('Failed to load auth session:', error);
      return { ok: false, error: 'unknown' };
    }
  },

  async logout(): Promise<LogoutApiResult> {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
      return { ok: true };
    } catch (error) {
      console.error('Failed to logout:', error);
      return { ok: false, error: 'unknown' };
    }
  }
};
