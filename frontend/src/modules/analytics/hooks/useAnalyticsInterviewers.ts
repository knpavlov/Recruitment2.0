import { useCallback, useEffect, useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';

interface HookState {
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const useAnalyticsInterviewers = (
  period: InterviewerPeriod,
  options: { interviewerIds?: string[]; roles?: string[] }
): HookState => {
  const [data, setData] = useState<InterviewerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getInterviewerStats(period, options);
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Failed to load interviewer analytics:', err);
      setError('Unable to load interviewer statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period, options.interviewerIds?.join(','), options.roles?.join(',')]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
