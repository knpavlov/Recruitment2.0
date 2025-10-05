import { NavigationItem, NavigationKey } from '../../app/navigation';
import styles from '../../styles/Sidebar.module.css';
import { useAuth } from '../../modules/auth/AuthContext';

interface SidebarProps {
  navigationItems: NavigationItem[];
  activeItem: NavigationKey;
  onNavigate: (key: NavigationKey) => void;
}

export const Sidebar = ({ navigationItems, activeItem, onNavigate }: SidebarProps) => {
  const { setRole } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>R2</div>
        <div className={styles.logoText}>
          <span className={styles.companyName}>Recruitment</span>
          <span className={styles.version}>2.0</span>
        </div>
      </div>
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
            // Placeholder for future backend integration
            setRole('user');
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};
