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

const AppContent = () => {
  const { role } = useAuth();
  const [activePage, setActivePage] = useState<NavigationKey>('cases');

  const accessibleItems = useMemo(
    () => navigationItems.filter((item) => item.roleAccess.includes(role)),
    [role]
  );

  useEffect(() => {
    if (!accessibleItems.find((item) => item.key === activePage)) {
      setActivePage(accessibleItems[0]?.key ?? 'evaluation');
    }
  }, [accessibleItems, activePage]);

  const renderContent = () => {
    switch (activePage) {
      case 'cases':
        return <CasesScreen />;
      case 'questions':
        return <PlaceholderScreen title="База фит вопросов" description="Раздел находится в разработке." />;
      case 'candidates':
        return <CandidatesScreen />;
      case 'evaluation':
        return <EvaluationScreen />;
      case 'stats':
        return <PlaceholderScreen title="Статистика" description="Раздел появится на следующем этапе." />;
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
