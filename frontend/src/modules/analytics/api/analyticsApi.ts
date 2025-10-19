import { apiRequest } from '../../../shared/api/httpClient';
import { buildApiUrl } from '../../../shared/config/runtimeConfig';
import {
  AnalyticsInterviewersResponse,
  AnalyticsSummaryPeriod,
  AnalyticsSummaryResponse,
  AnalyticsTimeGranularity,
  AnalyticsTimeSeriesResponse
} from '../../../shared/types/analytics';

// Запросы для получения аналитики
export const fetchAnalyticsSummary = (period: AnalyticsSummaryPeriod) =>
  apiRequest<AnalyticsSummaryResponse>(`/analytics/summary?period=${encodeURIComponent(period)}`);

interface TimeSeriesParams {
  start: string;
  end: string;
  granularity: AnalyticsTimeGranularity;
}

export const fetchAnalyticsTimeSeries = ({ start, end, granularity }: TimeSeriesParams) => {
  const params = new URLSearchParams({ start, end, granularity });
  return apiRequest<AnalyticsTimeSeriesResponse>(`/analytics/time-series?${params.toString()}`);
};

export const fetchAnalyticsInterviewers = ({ start, end, granularity }: TimeSeriesParams) => {
  const params = new URLSearchParams({ start, end, granularity });
  return apiRequest<AnalyticsInterviewersResponse>(`/analytics/interviewers?${params.toString()}`);
};

const downloadBinary = async (path: string): Promise<Blob> => {
  const response = await fetch(buildApiUrl(path));
  if (!response.ok) {
    throw new Error('Не удалось скачать файл с аналитикой.');
  }
  return response.blob();
};

export const exportAnalyticsSummary = (period: AnalyticsSummaryPeriod) =>
  downloadBinary(`/analytics/summary/export?period=${encodeURIComponent(period)}`);

export const exportAnalyticsTimeSeries = ({ start, end, granularity }: TimeSeriesParams) => {
  const params = new URLSearchParams({ start, end, granularity });
  return downloadBinary(`/analytics/time-series/export?${params.toString()}`);
};

export const exportAnalyticsInterviewers = ({ start, end, granularity }: TimeSeriesParams) => {
  const params = new URLSearchParams({ start, end, granularity });
  return downloadBinary(`/analytics/interviewers/export?${params.toString()}`);
};
