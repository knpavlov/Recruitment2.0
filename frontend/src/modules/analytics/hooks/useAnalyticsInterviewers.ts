import { useCallback, useEffect, useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import type { InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';

interface HookState {
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const useAnalyticsInterviewers = (
  groupBy: TimelineGrouping,
  options: { from?: string; to?: string; interviewerIds?: string[] }
): HookState => {
  const [data, setData] = useState<InterviewerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getInterviewerStats(groupBy, options);
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Не удалось загрузить статистику интервьюеров:', err);
      setError('Не удалось загрузить статистику интервьюеров. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }, [groupBy, options.from, options.to, options.interviewerIds?.join(',')]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
