import { createContext, ReactNode, useContext, useState } from 'react';
import { AccountRole } from '../../shared/types/account';

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
