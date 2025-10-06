import { ReactNode } from 'react';
import { NavigationItem, NavigationKey } from './navigation';
import { Sidebar } from '../components/layout/Sidebar';
import styles from '../styles/AppLayout.module.css';
import { useAuth } from '../modules/auth/AuthContext';

const roleLabels = {
  'super-admin': 'Super admin',
  admin: 'Admin',
  user: 'User'
} as const;

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
            <p className={styles.topbarGreeting}>Welcome, {session.email}</p>
            <p className={styles.topbarHint}>Role: {roleLabels[session.role]}</p>
          </div>
          <div className={styles.topbarHintBlock}>
            <p className={styles.topbarHintSecondary}>Use the sidebar to move between sections.</p>
          </div>
        </div>
        <div className={styles.pageContainer}>{children}</div>
      </main>
    </div>
  );
};
