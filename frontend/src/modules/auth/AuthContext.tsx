import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  persistence: 'local' | 'session';
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
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

const isRole = (value: unknown): value is AccountRole =>
  value === 'super-admin' || value === 'admin' || value === 'user';

const isBrowserEnvironment = () => typeof window !== 'undefined';

const parseStoredSession = (raw: string, fallbackPersistence: AuthSession['persistence']): AuthSession | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const token = typeof parsed.token === 'string' && parsed.token.trim() ? parsed.token : null;
    const email = typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email.trim().toLowerCase() : null;
    const role = isRole(parsed.role) ? parsed.role : null;
    const expiresAt = typeof parsed.expiresAt === 'number' && Number.isFinite(parsed.expiresAt)
      ? parsed.expiresAt
      : null;
    const persistence = parsed.persistence === 'local' || parsed.persistence === 'session'
      ? parsed.persistence
      : fallbackPersistence;

    if (!token || !email || !role || !expiresAt) {
      return null;
    }

    return { token, email, role, expiresAt, persistence };
  } catch (error) {
    console.warn('Failed to parse persisted session:', error);
    return null;
  }
};

const readStoredSession = (): AuthSession | null => {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const storages: Array<{ storage: Storage; persistence: AuthSession['persistence'] }> = [
    { storage: window.localStorage, persistence: 'local' },
    { storage: window.sessionStorage, persistence: 'session' }
  ];

  for (const { storage, persistence } of storages) {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      continue;
    }

    const parsed = parseStoredSession(raw, persistence);
    if (!parsed) {
      storage.removeItem(SESSION_STORAGE_KEY);
      continue;
    }

    if (parsed.expiresAt <= Date.now()) {
      storage.removeItem(SESSION_STORAGE_KEY);
      continue;
    }

    return parsed;
  }

  return null;
};

const persistSession = (session: AuthSession) => {
  if (!isBrowserEnvironment()) {
    return;
  }

  const payload = JSON.stringify(session);
  const primary = session.persistence === 'local' ? window.localStorage : window.sessionStorage;
  const secondary = session.persistence === 'local' ? window.sessionStorage : window.localStorage;

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
  const sessionRef = useRef<AuthSession | null>(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
        const persistence: AuthSession['persistence'] = remember ? 'local' : 'session';
        const now = Date.now();
        const ttl = persistence === 'local' ? LONG_SESSION_MS : SHORT_SESSION_MS;
        const computedExpiresAt = now + ttl;
        const expiresAt = Number.isFinite(computedExpiresAt) && computedExpiresAt > now
          ? computedExpiresAt
          : now + SHORT_SESSION_MS;
        const normalizedResponseEmail = response.email.trim().toLowerCase();
        const nextSession: AuthSession = {
          token: response.token,
          email: normalizedResponseEmail,
          role: response.role,
          expiresAt,
          persistence
        };
        setSession(nextSession);
        persistSession(nextSession);
        rememberEmail(normalizedResponseEmail);
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

    const checkExpiration = () => {
      const current = sessionRef.current;
      if (!current) {
        return;
      }
      if (current.expiresAt <= Date.now()) {
        logout();
      }
    };

    checkExpiration();

    const intervalId = window.setInterval(checkExpiration, SESSION_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
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
