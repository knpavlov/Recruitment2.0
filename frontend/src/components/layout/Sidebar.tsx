import { NavigationItem, NavigationKey } from '../../app/navigation';
import styles from '../../styles/Sidebar.module.css';
import { useAuth } from '../../modules/auth/AuthContext';

interface SidebarProps {
  navigationItems: NavigationItem[];
  activeItem: NavigationKey;
  onNavigate: (key: NavigationKey) => void;
}

export const Sidebar = ({ navigationItems, activeItem, onNavigate }: SidebarProps) => {
  const { session, logout } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>R2</div>
        <div className={styles.logoText}>
          <span className={styles.companyName}>Recruitment</span>
          <span className={styles.version}>2.0</span>
        </div>
      </div>
      {session && (
        <div className={styles.userSummary}>
          <p className={styles.userEmail}>{session.email}</p>
          <p className={styles.userRole}>{session.role === 'super-admin' ? 'Super admin' : session.role === 'admin' ? 'Admin' : 'User'}</p>
        </div>
      )}
      <nav className={styles.menu}>
        {navigationItems.map((item) => (
          <button
            key={item.key}
            className={item.key === activeItem ? styles.activeItem : styles.menuItem}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className={styles.logoutBlock}>
        <button
          className={styles.logoutButton}
          onClick={() => {
            void logout();
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};
