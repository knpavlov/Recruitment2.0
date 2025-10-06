import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from './app/AppLayout';
import { NavigationKey, navigationItems } from './app/navigation';
import { CasesScreen } from './modules/cases/CasesScreen';
import { CandidatesScreen } from './modules/candidates/CandidatesScreen';
import { EvaluationScreen } from './modules/evaluation/EvaluationScreen';
import { AccountsScreen } from './modules/accounts/AccountsScreen';
import { PlaceholderScreen } from './shared/ui/PlaceholderScreen';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { LoginScreen } from './modules/auth/LoginScreen';
import { AppStateProvider } from './app/state/AppStateContext';

const AppContent = () => {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState<NavigationKey>('cases');

  const accessibleItems = useMemo(
    () =>
      session
        ? navigationItems.filter((item) => item.roleAccess.includes(session.role))
        : [],
    [session]
  );

  useEffect(() => {
    if (!accessibleItems.find((item) => item.key === activePage)) {
      setActivePage(accessibleItems[0]?.key ?? 'evaluation');
    }
  }, [accessibleItems, activePage]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a' }}>
        <p style={{ color: '#f8fafc', fontSize: '16px' }}>Loading the dashboard…</p>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'cases':
        return <CasesScreen />;
      case 'questions':
        return (
          <PlaceholderScreen
            title="Fit questions database"
            description="This section is under development."
          />
        );
      case 'candidates':
        return <CandidatesScreen />;
      case 'evaluation':
        return <EvaluationScreen />;
      case 'stats':
        return (
          <PlaceholderScreen
            title="Analytics"
            description="This section will be added in the next iteration."
          />
        );
      case 'accounts':
        return <AccountsScreen />;
      default:
        return null;
    }
  };

  return (
    <AppLayout
      navigationItems={accessibleItems}
      activeItem={activePage}
      onNavigate={setActivePage}
    >
      {renderContent()}
    </AppLayout>
  );
};

export const App = () => (
  <AuthProvider>
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  </AuthProvider>
);
