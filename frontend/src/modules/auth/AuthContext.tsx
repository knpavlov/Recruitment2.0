import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccountRole } from '../../shared/types/account';
import { accountsApi } from '../accounts/api/accountsApi';

interface AuthContextValue {
  role: AccountRole;
  setRole: (role: AccountRole) => void;
  email: string;
  setEmail: (email: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<AccountRole>('super-admin');
  const [email, setEmail] = useState('super.admin@company.com');
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadSuperAdmin = async () => {
      try {
        const accounts = await accountsApi.list();
        const superAdmin = accounts.find((account) => account.role === 'super-admin');
        if (!cancelled && superAdmin) {
          setEmail(superAdmin.email);
        }
      } catch (error) {
        console.error('Не удалось получить email суперадмина', error);
      }
    };
    void loadSuperAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ role, setRole, email, setEmail, rememberMe, setRememberMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContext не найден. Оберните приложение в AuthProvider.');
  }
  return context;
};
