import { useEffect, useState } from 'react';
import { interviewerApi } from '../../modules/evaluation/services/interviewerApi';

/**
 * The hook checks whether the current user has at least one interviewer assignment.
 * This enables the "Interviews" section to be added dynamically to the admin navigation.
 */
export const useHasInterviewerAssignments = (email: string | null | undefined): boolean => {
  const [hasAssignments, setHasAssignments] = useState(false);

  useEffect(() => {
    if (!email) {
      setHasAssignments(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const items = await interviewerApi.listAssignments(email);
        if (!cancelled) {
          setHasAssignments(items.length > 0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to check interviewer assignments:', error);
          setHasAssignments(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [email]);

  return hasAssignments;
};
