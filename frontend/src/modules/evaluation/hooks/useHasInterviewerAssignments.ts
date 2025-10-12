import { useEffect, useState } from 'react';
import { interviewerApi } from '../services/interviewerApi';

interface Options {
  email: string | null | undefined;
  enabled: boolean;
}

interface Result {
  hasAssignments: boolean;
  loading: boolean;
}

/**
 * Хук проверяет, есть ли у пользователя хотя бы одно назначение интервьюера.
 */
export const useHasInterviewerAssignments = ({ email, enabled }: Options): Result => {
  const [state, setState] = useState<Result>({ hasAssignments: false, loading: false });

  useEffect(() => {
    if (!enabled || !email) {
      setState({ hasAssignments: false, loading: false });
      return;
    }

    let isCancelled = false;
    setState({ hasAssignments: false, loading: true });

    interviewerApi
      .listAssignments(email)
      .then((items) => {
        if (!isCancelled) {
          setState({ hasAssignments: items.length > 0, loading: false });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setState({ hasAssignments: false, loading: false });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [email, enabled]);

  return state;
};
