import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccountRole } from '../../shared/types/account';
import { useAccountsState } from '../../app/state/AppStateContext';

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
  const { list } = useAccountsState();
  const [role, setRole] = useState<AccountRole>('super-admin');
  const [email, setEmailState] = useState('—');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    if (emailLocked) {
      return;
    }
    const superAdmin = list.find((account) => account.role === 'super-admin');
    if (superAdmin) {
      setEmailState(superAdmin.email);
    }
  }, [list, emailLocked]);

  const setEmail = (value: string) => {
    setEmailState(value);
    setEmailLocked(true);
  };

  return (
    <AuthContext.Provider value={{ role, setRole, email, setEmail, rememberMe, setRememberMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContext is missing. Wrap the app in AuthProvider.');
  }
  return context;
};
