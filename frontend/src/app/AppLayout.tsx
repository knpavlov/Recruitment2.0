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
  const { role, setRole, email } = useAuth();

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
            <p className={styles.topbarGreeting}>Welcome, {email}</p>
            <p className={styles.topbarHint}>Choose a role to test access segregation.</p>
          </div>
          <label className={styles.roleSelector}>
            <span>Current role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="super-admin">{roleLabels['super-admin']}</option>
              <option value="admin">{roleLabels.admin}</option>
              <option value="user">{roleLabels.user}</option>
            </select>
          </label>
        </div>
        <div className={styles.pageContainer}>{children}</div>
      </main>
    </div>
  );
};
