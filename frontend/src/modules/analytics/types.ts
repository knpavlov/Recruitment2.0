import { CandidateProfile } from '../../shared/types/candidate';
import { EvaluationConfig } from '../../shared/types/evaluation';

export type SummaryPeriod = 'rolling-3' | 'fy-to-date' | 'rolling-12';

export interface SummaryMetric {
  id: 'female-share' | 'offer-acceptance' | 'offer-rate';
  label: string;
  value: number | null;
  trendLabel: string;
}

export type TimeGranularity = 'week' | 'month' | 'quarter';

export interface PipelineMetricsPoint {
  start: string;
  label: string;
  resumes: number;
  firstRoundInterviews: number;
  secondRoundInterviews: number;
  totalInterviews: number;
  rejects: number;
  offers: number;
  avgCaseScore: number | null;
  avgFitScore: number | null;
  femaleShare: number | null;
}

export interface PipelineTimeline {
  granularity: TimeGranularity;
  points: PipelineMetricsPoint[];
}

export interface SummaryMetricsByPeriod {
  period: SummaryPeriod;
  metrics: SummaryMetric[];
}

export interface InterviewerPeriodStats {
  start: string;
  label: string;
  interviews: number;
  avgCaseScore: number | null;
  avgFitScore: number | null;
  positiveDecisions: number;
  negativeDecisions: number;
}

export interface InterviewerAggregateStats {
  interviewerId: string;
  interviewerName: string;
  snapshots: InterviewerPeriodStats[];
  totals: {
    interviews: number;
    avgCaseScore: number | null;
    avgFitScore: number | null;
    positiveDecisions: number;
    negativeDecisions: number;
  };
}

export interface AnalyticsDataset {
  summaries: SummaryMetricsByPeriod[];
  timelines: Record<TimeGranularity, PipelineTimeline>;
  interviewers: InterviewerAggregateStats[];
  source: {
    candidates: CandidateProfile[];
    evaluations: EvaluationConfig[];
  };
}
