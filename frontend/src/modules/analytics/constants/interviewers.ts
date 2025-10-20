import type { InterviewerPeriod } from '../types/analytics';

export const INTERVIEWER_PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  rolling_3: 'Last 3 months',
  fytd: 'Fiscal year to date',
  rolling_12: 'Rolling 12 months'
};

export const INTERVIEWER_PERIOD_ORDER: InterviewerPeriod[] = [
  'last_month',
  'rolling_3',
  'fytd',
  'rolling_12'
];
