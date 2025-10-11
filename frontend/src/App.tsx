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

const AppContent = () => {
  const { session } = useAuth();
  const [activePage, setActivePage] = useState<NavigationKey>('cases');

  useEffect(() => {
    if (!session) {
      setActivePage('cases');
    }
  }, [session]);

  const accessibleItems = useMemo(() => {
    if (!session) {
      return [];
    }

    return navigationItems.filter((item) => item.roleAccess.includes(session.role));
  }, [session]);

  useEffect(() => {
    if (!session || accessibleItems.length === 0) {
      return;
    }

    if (!accessibleItems.some((item) => item.key === activePage)) {
      setActivePage(accessibleItems[0].key);
    }
  }, [session, accessibleItems, activePage]);

  if (!session) {
    return <LoginScreen />;
  }

  if (accessibleItems.length === 0) {
    return (
      <AppLayout navigationItems={[]} activeItem={activePage} onNavigate={setActivePage}>
        <PlaceholderScreen
          title="No sections available"
          description="Your role does not grant access to any sections yet. Contact the administrator to enable modules."
        />
      </AppLayout>
    );
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
