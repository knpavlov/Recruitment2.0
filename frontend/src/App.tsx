import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from './app/AppLayout';
import { NavigationKey, navigationItems } from './app/navigation';
import { CasesScreen } from './modules/cases/CasesScreen';
import { CandidatesScreen } from './modules/candidates/CandidatesScreen';
import { EvaluationScreen } from './modules/evaluation/EvaluationScreen';
import { AccountsScreen } from './modules/accounts/AccountsScreen';
import { PlaceholderScreen } from './shared/ui/PlaceholderScreen';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { AppStateProvider } from './app/state/AppStateContext';
import { LoginScreen } from './modules/auth/LoginScreen';
import { NoAccessScreen } from './modules/auth/NoAccessScreen';

const AppContent = () => {
  const { session } = useAuth();
  const [activePage, setActivePage] = useState<NavigationKey>('evaluation');

  useEffect(() => {
    if (!session) {
      setActivePage('evaluation');
    }
  }, [session]);

  if (!session) {
    return <LoginScreen />;
  }

  const accessibleItems = useMemo(
    () => navigationItems.filter((item) => item.roleAccess.includes(session.role)),
    [session.role]
  );

  const fallbackPage = accessibleItems[0]?.key ?? 'evaluation';

  useEffect(() => {
    setActivePage((current) =>
      accessibleItems.some((item) => item.key === current) ? current : fallbackPage
    );
  }, [accessibleItems, fallbackPage]);

  const renderContent = (page: NavigationKey) => {
    switch (page) {
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
        return <NoAccessScreen />;
    }
  };

  const hasNavigation = accessibleItems.length > 0;
  const resolvedPage = hasNavigation ? activePage : fallbackPage;

  return (
    <AppLayout
      navigationItems={accessibleItems}
      activeItem={resolvedPage}
      onNavigate={setActivePage}
    >
      {hasNavigation ? renderContent(resolvedPage) : <NoAccessScreen />}
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
