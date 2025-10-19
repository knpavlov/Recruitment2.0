import { InterviewerAggregateStats } from '../types';

export const INTERVIEWER_RANGE_OPTIONS = [
  { key: '4w', label: '4 недели', weeks: 4 },
  { key: '12w', label: '12 недель', weeks: 12 },
  { key: '24w', label: '24 недели', weeks: 24 },
  { key: '52w', label: '52 недели', weeks: 52 }
] as const;

export type InterviewerRangeKey = (typeof INTERVIEWER_RANGE_OPTIONS)[number]['key'];

const resolveCutoffDate = (range: InterviewerRangeKey): Date => {
  const weeks = INTERVIEWER_RANGE_OPTIONS.find((option) => option.key === range)?.weeks ?? 12;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - weeks * 7);
  return date;
};

export interface AggregatedInterviewerRow {
  id: string;
  name: string;
  interviews: number;
  avgCaseScore: number | null;
  avgFitScore: number | null;
  positive: number;
  negative: number;
  recent: string;
}

export interface InterviewerSummaryRow {
  totalInterviews: number;
  avgCase: number | null;
  avgFit: number | null;
  positive: number;
  negative: number;
}

export const aggregateInterviewers = (
  interviewers: InterviewerAggregateStats[],
  selectedIds: string[],
  range: InterviewerRangeKey
): AggregatedInterviewerRow[] => {
  const cutoffDate = resolveCutoffDate(range);
  const rows: AggregatedInterviewerRow[] = [];
  for (const interviewer of interviewers) {
    if (!selectedIds.includes(interviewer.interviewerId)) {
      continue;
    }
    const relevant = interviewer.snapshots.filter((snapshot) => {
      const date = new Date(snapshot.start);
      return date >= cutoffDate;
    });
    if (!relevant.length) {
      continue;
    }
    const totalInterviews = relevant.reduce((sum, snapshot) => sum + snapshot.interviews, 0);
    const caseSum = relevant.reduce(
      (sum, snapshot) => (snapshot.avgCaseScore !== null ? sum + snapshot.avgCaseScore * snapshot.interviews : sum),
      0
    );
    const caseCount = relevant.reduce(
      (sum, snapshot) => sum + (snapshot.avgCaseScore !== null ? snapshot.interviews : 0),
      0
    );
    const fitSum = relevant.reduce(
      (sum, snapshot) => (snapshot.avgFitScore !== null ? sum + snapshot.avgFitScore * snapshot.interviews : sum),
      0
    );
    const fitCount = relevant.reduce(
      (sum, snapshot) => sum + (snapshot.avgFitScore !== null ? snapshot.interviews : 0),
      0
    );
    const positive = relevant.reduce((sum, snapshot) => sum + snapshot.positiveDecisions, 0);
    const negative = relevant.reduce((sum, snapshot) => sum + snapshot.negativeDecisions, 0);
    const recent = relevant
      .slice(-3)
      .map((snapshot) => `${snapshot.label}: ${snapshot.interviews}`)
      .join(' · ');
    rows.push({
      id: interviewer.interviewerId,
      name: interviewer.interviewerName,
      interviews: totalInterviews,
      avgCaseScore: caseCount > 0 ? caseSum / caseCount : null,
      avgFitScore: fitCount > 0 ? fitSum / fitCount : null,
      positive,
      negative,
      recent
    });
  }
  return rows.sort((a, b) => b.interviews - a.interviews);
};

export const summarizeInterviewers = (rows: AggregatedInterviewerRow[]): InterviewerSummaryRow => {
  const totalInterviews = rows.reduce((sum, row) => sum + row.interviews, 0);
  const caseSum = rows.reduce(
    (sum, row) => (row.avgCaseScore !== null ? sum + row.avgCaseScore * row.interviews : sum),
    0
  );
  const caseCount = rows.reduce(
    (sum, row) => sum + (row.avgCaseScore !== null ? row.interviews : 0),
    0
  );
  const fitSum = rows.reduce(
    (sum, row) => (row.avgFitScore !== null ? sum + row.avgFitScore * row.interviews : sum),
    0
  );
  const fitCount = rows.reduce(
    (sum, row) => sum + (row.avgFitScore !== null ? row.interviews : 0),
    0
  );
  const positive = rows.reduce((sum, row) => sum + row.positive, 0);
  const negative = rows.reduce((sum, row) => sum + row.negative, 0);
  return {
    totalInterviews,
    avgCase: caseCount > 0 ? caseSum / caseCount : null,
    avgFit: fitCount > 0 ? fitSum / fitCount : null,
    positive,
    negative
  };
};
