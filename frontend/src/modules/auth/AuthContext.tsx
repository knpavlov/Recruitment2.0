import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { authApi } from './services/authApi';
import { AuthSession } from '../../shared/types/auth';

interface RequestCodeSuccess {
  ok: true;
  email: string;
}

export type RequestCodeError = 'invalid-email' | 'not-found' | 'unknown';

export type RequestCodeResult = RequestCodeSuccess | { ok: false; error: RequestCodeError };

interface VerifyCodeSuccess {
  ok: true;
  session: AuthSession;
}

export type VerifyCodeError = 'invalid' | 'expired' | 'unknown';

export type VerifyCodeResult = VerifyCodeSuccess | { ok: false; error: VerifyCodeError };

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  requestCode: (email: string) => Promise<RequestCodeResult>;
  verifyCode: (email: string, code: string, remember: boolean) => Promise<VerifyCodeResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const result = await authApi.loadSession();
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setSession(result.session);
      }
      setLoading(false);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestCode = useCallback(async (email: string): Promise<RequestCodeResult> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, error: 'invalid-email' };
    }
    const result = await authApi.requestCode(normalized);
    if (result.ok) {
      return { ok: true, email: normalized };
    }
    return { ok: false, error: result.error };
  }, []);

  const verifyCode = useCallback(
    async (email: string, code: string, remember: boolean): Promise<VerifyCodeResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = code.trim();
      if (!normalizedEmail || !trimmedCode) {
        return { ok: false, error: 'invalid' };
      }
      const result = await authApi.verifyCode(normalizedEmail, trimmedCode, remember);
      if (result.ok) {
        setSession(result.session);
        return { ok: true, session: result.session };
      }
      return { ok: false, error: result.error };
    },
    []
  );

  const logout = useCallback(async () => {
    // Даже если запрос завершится ошибкой, локально сбрасываем сессию
    await authApi.logout();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, requestCode, verifyCode, logout }),
    [loading, logout, requestCode, session, verifyCode]
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
