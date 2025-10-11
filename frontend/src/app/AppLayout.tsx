import { ReactNode } from 'react';
import { NavigationItem, NavigationKey } from './navigation';
import { Sidebar } from '../components/layout/Sidebar';
import styles from '../styles/AppLayout.module.css';
import { useAuth } from '../modules/auth/AuthContext';
import { AccountRole } from '../shared/types/account';

const roleLabels: Record<AccountRole, string> = {
  'super-admin': 'Super admin',
  admin: 'Admin',
  user: 'User'
};

interface AppLayoutProps {
  navigationItems: NavigationItem[];
  activeItem: NavigationKey;
  onNavigate: (key: NavigationKey) => void;
  children: ReactNode;
}

export const AppLayout = ({ navigationItems, activeItem, onNavigate, children }: AppLayoutProps) => {
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  const roleLabel = roleLabels[session.role] ?? 'Account';

  return (
    <div className={styles.container}>
      <Sidebar
        navigationItems={navigationItems}
        activeItem={activeItem}
        onNavigate={onNavigate}
      />
      <main className={styles.content}>
        <div className={styles.topbar}>
          <div>
            <p className={styles.topbarGreeting}>Welcome back</p>
            <p className={styles.topbarHint}>Signed in as {session.email}</p>
          </div>
          <span className={styles.roleBadge}>{roleLabel}</span>
        </div>
        <div className={styles.pageContainer}>{children}</div>
      </main>
    </div>
  );
};
