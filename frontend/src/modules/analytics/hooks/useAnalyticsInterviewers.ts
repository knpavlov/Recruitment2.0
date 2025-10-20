import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import type { InterviewerStatsResponse, InterviewerPeriod } from '../types/analytics';

interface HookState {
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  range: { from: string; to: string };
}

const FISCAL_YEAR_START_MONTH = 4;

const startOfDay = (value: Date) => {
  const date = new Date(value.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value.getTime());
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);

const subtractMonths = (value: Date, months: number) => {
  const date = new Date(value.getTime());
  date.setMonth(date.getMonth() - months);
  return date;
};

const formatDate = (value: Date) => startOfDay(value).toISOString().slice(0, 10);

const resolvePeriodRange = (period: InterviewerPeriod) => {
  const now = new Date();
  const end = endOfDay(now);
  let start: Date;

  switch (period) {
    case 'last_month':
      start = startOfDay(subtractMonths(end, 1));
      break;
    case 'rolling_3':
      start = startOfMonth(subtractMonths(end, 2));
      break;
    case 'rolling_12':
      start = startOfMonth(subtractMonths(end, 11));
      break;
    case 'fytd': {
      const fiscalStartIndex = FISCAL_YEAR_START_MONTH - 1;
      let fiscalYear = end.getFullYear();
      if (end.getMonth() < fiscalStartIndex) {
        fiscalYear -= 1;
      }
      start = startOfMonth(new Date(fiscalYear, fiscalStartIndex, 1));
      break;
    }
    default:
      start = startOfMonth(end);
      break;
  }

  return { from: formatDate(start), to: formatDate(end) };
};

export const useAnalyticsInterviewers = (period: InterviewerPeriod): HookState => {
  const [data, setData] = useState<InterviewerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => resolvePeriodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getInterviewerStats({
        groupBy: 'month',
        from: range.from,
        to: range.to
      });
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Failed to load interviewer analytics:', err);
      setError('Failed to load interviewer statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load, range };
};
