export type SummaryPeriod = 'rolling-quarter' | 'financial-year' | 'rolling-year';

export type TimelineView = 'weekly' | 'monthly' | 'quarterly';

export interface AnalyticsSnapshot {
  /** Дата начала недели, для которой собраны показатели */
  date: string;
  resumeCount: number;
  firstRoundCount: number;
  secondRoundCount: number;
  totalInterviewCount: number;
  rejectCount: number;
  offerCount: number;
  offerAcceptedCount: number;
  femaleCandidates: number;
  totalCandidates: number;
  caseScoreSum: number;
  fitScoreSum: number;
  scoreCount: number;
}

export interface MonthlyAggregate {
  year: number;
  month: number;
  label: string;
  resumeCount: number;
  firstRoundCount: number;
  secondRoundCount: number;
  totalInterviewCount: number;
  rejectCount: number;
  offerCount: number;
  offerAcceptedCount: number;
  femaleCandidates: number;
  totalCandidates: number;
  caseScoreSum: number;
  fitScoreSum: number;
  scoreCount: number;
}

export interface QuarterAggregate {
  year: number;
  quarter: number;
  label: string;
  resumeCount: number;
  firstRoundCount: number;
  secondRoundCount: number;
  totalInterviewCount: number;
  rejectCount: number;
  offerCount: number;
  offerAcceptedCount: number;
  femaleCandidates: number;
  totalCandidates: number;
  caseScoreSum: number;
  fitScoreSum: number;
  scoreCount: number;
}

export interface SummaryMetricCard {
  key: 'female-share' | 'offer-acceptance' | 'offer-rate';
  label: string;
  value: number;
  previousValue: number | null;
  description: string;
}

export interface SummaryMetricExportRow {
  periodLabel: string;
  femaleShare: number;
  offerAcceptanceRate: number;
  offerRate: number;
  [key: string]: string | number | null;
}

export interface PipelineSeries {
  key: string;
  label: string;
  axis?: 'primary' | 'secondary';
  values: number[];
}

export interface PipelineChartDataset {
  labels: string[];
  series: PipelineSeries[];
  exportRows: PipelineExportRow[];
}

export interface PipelineExportRow {
  period: string;
  resumes: number;
  firstRound: number;
  secondRound: number;
  allInterviews: number;
  rejects: number;
  offers: number;
  avgCaseScore: number | null;
  avgFitScore: number | null;
  femaleShare: number | null;
  [key: string]: string | number | null;
}

export interface InterviewerSnapshot {
  date: string;
  interviewerId: string;
  interviewerName: string;
  interviewerEmail: string;
  interviews: number;
  caseScoreSum: number;
  fitScoreSum: number;
  scoreCount: number;
  hireRecommendations: number;
  rejectRecommendations: number;
}

export interface InterviewerSummary {
  id: string;
  name: string;
  email: string;
  weeklyInterviews: number;
  monthlyInterviews: number;
  quarterlyInterviews: number;
  caseScoreAverage: number | null;
  fitScoreAverage: number | null;
  hireRecommendations: number;
  rejectRecommendations: number;
}

export interface AnalyticsData {
  timeline: AnalyticsSnapshot[];
  interviewers: InterviewerSnapshot[];
  financialYearStartMonth: number;
}
