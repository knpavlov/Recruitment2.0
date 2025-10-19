// Типы для раздела аналитики. Комментарии на русском для лучшей поддержки команды.

export type AnalyticsSummaryPeriod =
  | 'rolling-3-month'
  | 'fiscal-year-to-date'
  | 'rolling-12-month';

export type AnalyticsTimeGranularity = 'week' | 'month' | 'quarter';

export interface AnalyticsSummaryMetricValue {
  value: number | null;
  numerator: number;
  denominator: number;
}

export interface AnalyticsSummaryResponse {
  period: AnalyticsSummaryPeriod;
  periodStart: string;
  periodEnd: string;
  metrics: {
    femaleShare: AnalyticsSummaryMetricValue;
    offerAcceptanceRate: AnalyticsSummaryMetricValue;
    offerRate: AnalyticsSummaryMetricValue;
  };
}

export interface AnalyticsTimeSeriesPoint {
  periodStart: string;
  periodEnd: string;
  resumesReceived: number;
  firstRoundInterviews: number;
  secondRoundInterviews: number;
  totalInterviews: number;
  rejections: number;
  offers: number;
  averageCaseScore: number | null;
  averageFitScore: number | null;
  femaleShare: number | null;
}

export interface AnalyticsTimeSeriesResponse {
  start: string;
  end: string;
  granularity: AnalyticsTimeGranularity;
  points: AnalyticsTimeSeriesPoint[];
}

export interface AnalyticsInterviewerTimelinePoint {
  periodStart: string;
  periodEnd: string;
  interviews: number;
  averageCaseScore: number | null;
  averageFitScore: number | null;
  hireRecommendations: number;
  rejectRecommendations: number;
  otherRecommendations: number;
}

export interface AnalyticsInterviewerStats {
  interviewerEmail?: string;
  interviewerName: string;
  interviews: number;
  averageCaseScore: number | null;
  averageFitScore: number | null;
  hireRecommendations: number;
  rejectRecommendations: number;
  otherRecommendations: number;
  timeline: AnalyticsInterviewerTimelinePoint[];
}

export interface AnalyticsInterviewersResponse {
  start: string;
  end: string;
  granularity: AnalyticsTimeGranularity;
  interviewers: AnalyticsInterviewerStats[];
  availableInterviewers: {
    interviewerEmail?: string;
    interviewerName: string;
  }[];
}
