import { useCallback, useEffect, useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import type { SummaryPeriod, SummaryResponse } from '../types/analytics';

interface HookState {
  data: SummaryResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const useAnalyticsSummary = (period: SummaryPeriod): HookState => {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getSummary(period);
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Не удалось загрузить сводные метрики аналитики:', err);
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
