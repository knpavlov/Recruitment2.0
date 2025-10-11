import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { AccountRole } from '../../shared/types/account';
import { ApiError } from '../../shared/api/httpClient';
import { authApi } from './services/authApi';

export interface AuthSession {
  token: string;
  email: string;
  role: AccountRole;
  expiresAt: number;
}

export type RequestCodeError = 'not-found' | 'forbidden' | 'mailer-unavailable' | 'unknown';
export type VerifyCodeError = 'invalid' | 'expired' | 'unknown';

interface RequestCodeSuccess {
  ok: true;
  email: string;
}

interface RequestCodeFailure {
  ok: false;
  error: RequestCodeError;
}

export type RequestCodeResult = RequestCodeSuccess | RequestCodeFailure;

interface VerifyCodeSuccess {
  ok: true;
  session: AuthSession;
}

interface VerifyCodeFailure {
  ok: false;
  error: VerifyCodeError;
}

export type VerifyCodeResult = VerifyCodeSuccess | VerifyCodeFailure;

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  requestAccessCode: (email: string) => Promise<RequestCodeResult>;
  verifyAccessCode: (email: string, code: string, remember: boolean) => Promise<VerifyCodeResult>;
  logout: () => void;
  lastEmail: string | null;
}

const SESSION_STORAGE_KEY = 'recruitment:session';
const LAST_EMAIL_KEY = 'recruitment:last-email';
const LONG_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

const isBrowserEnvironment = () => typeof window !== 'undefined';

const readStoredSession = (): AuthSession | null => {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const storages: Storage[] = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
      if (
        !parsed ||
        typeof parsed.token !== 'string' ||
        typeof parsed.email !== 'string' ||
        typeof parsed.role !== 'string' ||
        typeof parsed.expiresAt !== 'number'
      ) {
        storage.removeItem(SESSION_STORAGE_KEY);
        continue;
      }

      if (parsed.expiresAt <= Date.now()) {
        storage.removeItem(SESSION_STORAGE_KEY);
        continue;
      }

      return parsed as AuthSession;
    } catch (error) {
      console.warn('Failed to parse persisted session:', error);
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  return null;
};

const persistSession = (session: AuthSession, remember: boolean) => {
  if (!isBrowserEnvironment()) {
    return;
  }

  const payload = JSON.stringify(session);
  const primary = remember ? window.localStorage : window.sessionStorage;
  const secondary = remember ? window.sessionStorage : window.localStorage;

  primary.setItem(SESSION_STORAGE_KEY, payload);
  secondary.removeItem(SESSION_STORAGE_KEY);
};

const clearStoredSession = () => {
  if (!isBrowserEnvironment()) {
    return;
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

const readLastEmail = (): string | null => {
  if (!isBrowserEnvironment()) {
    return null;
  }
  const raw = window.localStorage.getItem(LAST_EMAIL_KEY);
  return raw?.trim() || null;
};

const storeLastEmail = (email: string) => {
  if (!isBrowserEnvironment()) {
    return;
  }
  window.localStorage.setItem(LAST_EMAIL_KEY, email);
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [lastEmail, setLastEmail] = useState<string | null>(() => readLastEmail());

  const rememberEmail = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    setLastEmail(normalized);
    storeLastEmail(normalized);
  }, []);

  const requestAccessCode = useCallback<Required<AuthContextValue>['requestAccessCode']>(
    async (email) => {
      const normalized = email.trim().toLowerCase();
      try {
        const response = await authApi.requestCode(normalized);
        rememberEmail(response.email);
        return { ok: true, email: response.email };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 404) {
            return { ok: false, error: 'not-found' };
          }
          if (error.status === 403) {
            return { ok: false, error: 'forbidden' };
          }
          if (error.status === 503) {
            return { ok: false, error: 'mailer-unavailable' };
          }
        }
        console.error('Failed to request access code:', error);
        return { ok: false, error: 'unknown' };
      }
    },
    [rememberEmail]
  );

  const verifyAccessCode = useCallback<Required<AuthContextValue>['verifyAccessCode']>(
    async (email, code, remember) => {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = code.trim();

      try {
        const response = await authApi.verifyCode(normalizedEmail, trimmedCode);
        const expiresAt = Date.now() + (remember ? LONG_SESSION_MS : SHORT_SESSION_MS);
        const nextSession: AuthSession = {
          token: response.token,
          email: response.email,
          role: response.role,
          expiresAt
        };
        setSession(nextSession);
        persistSession(nextSession, remember);
        rememberEmail(response.email);
        return { ok: true, session: nextSession };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 410) {
            return { ok: false, error: 'expired' };
          }
          if (error.status === 401 || error.status === 404) {
            return { ok: false, error: 'invalid' };
          }
        }
        console.error('Failed to verify access code:', error);
        return { ok: false, error: 'unknown' };
      }
    },
    [rememberEmail]
  );

  const logout = useCallback(() => {
    setSession(null);
    clearStoredSession();
  }, []);

  useEffect(() => {
    if (!session || !isBrowserEnvironment()) {
      return;
    }

    // Ограничение таймеров в браузере — 2 147 483 647 мс (~24,8 дня), поэтому
    // для длительных сессий планируем периодические проверки, чтобы избежать
    // мгновенного выхода из-за переполнения значения таймера.

    let disposed = false;
    let timeoutId: number | null = null;

    const scheduleCheck = () => {
      if (disposed) {
        return;
      }

      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) {
        logout();
        return;
      }

      const delay = Math.min(remaining, MAX_TIMEOUT_MS);
      timeoutId = window.setTimeout(() => {
        scheduleCheck();
      }, delay);
    };

    scheduleCheck();

    return () => {
      disposed = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [session, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      requestAccessCode,
      verifyAccessCode,
      logout,
      lastEmail
    }),
    [session, requestAccessCode, verifyAccessCode, logout, lastEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContext is missing. Wrap the app in AuthProvider.');
  }
  return context;
};
