import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from './app/AppLayout';
import { NavigationKey, navigationItems } from './app/navigation';
import { CasesScreen } from './modules/cases/CasesScreen';
import { CandidatesScreen } from './modules/candidates/CandidatesScreen';
import { EvaluationScreen } from './modules/evaluation/EvaluationScreen';
import { InterviewerScreen } from './modules/evaluation/InterviewerScreen';
import { AccountsScreen } from './modules/accounts/AccountsScreen';
import { PlaceholderScreen } from './shared/ui/PlaceholderScreen';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { AppStateProvider } from './app/state/AppStateContext';
import { LoginScreen } from './modules/auth/LoginScreen';
import { FitQuestionsScreen } from './modules/questions/FitQuestionsScreen';
import { interviewerApi } from './modules/evaluation/services/interviewerApi';

const AppContent = () => {
  const { session } = useAuth();
  const [activePage, setActivePage] = useState<NavigationKey>('cases');
  const [hasInterviewerAssignments, setHasInterviewerAssignments] = useState(false);

  useEffect(() => {
    if (!session) {
      setHasInterviewerAssignments(false);
      return;
    }

    if (session.role === 'user') {
      setHasInterviewerAssignments(true);
      return;
    }

    let cancelled = false;
    const loadAssignments = async () => {
      try {
        const assignments = await interviewerApi.listAssignments(session.email);
        if (!cancelled) {
          setHasInterviewerAssignments(assignments.length > 0);
        }
      } catch (error) {
        console.error('Failed to check interviewer assignments for navigation:', error);
        if (!cancelled) {
          setHasInterviewerAssignments(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setActivePage('cases');
    }
  }, [session]);

  const accessibleItems = useMemo(() => {
    if (!session) {
      return [];
    }
    return navigationItems.filter((item) => {
      if (!item.roleAccess.includes(session.role)) {
        return false;
      }
      if (item.key === 'interviews') {
        return session.role === 'user' || hasInterviewerAssignments;
      }
      return true;
    });
  }, [session, hasInterviewerAssignments]);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (!accessibleItems.length) {
      setActivePage('evaluations');
      return;
    }
    if (!accessibleItems.find((item) => item.key === activePage)) {
      setActivePage(accessibleItems[0].key);
    }
  }, [session, accessibleItems, activePage]);

  if (!session) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'cases':
        return <CasesScreen />;
      case 'questions':
        return <FitQuestionsScreen />;
      case 'candidates':
        return <CandidatesScreen />;
      case 'evaluations':
        return <EvaluationScreen />;
      case 'interviews':
        return <InterviewerScreen />;
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
