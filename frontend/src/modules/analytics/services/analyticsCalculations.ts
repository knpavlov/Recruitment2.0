import {
  AnalyticsSnapshot,
  MonthlyAggregate,
  QuarterAggregate,
  SummaryMetricCard,
  SummaryMetricExportRow,
  SummaryPeriod,
  TimelineView,
  PipelineChartDataset,
  PipelineExportRow,
  PipelineSeries,
  InterviewerSnapshot,
  InterviewerSummary
} from '../types';

type PipelineBucket = Omit<MonthlyAggregate, 'year' | 'month'>;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatMonthLabel = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 1));
  return date
    .toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(date.toLocaleDateString('ru-RU', { month: 'short' })[0], (char) => char.toUpperCase());
};

const formatQuarterLabel = (year: number, quarter: number) => `${quarter} кв. ${year}`;

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const groupByMonth = (timeline: AnalyticsSnapshot[]): MonthlyAggregate[] => {
  const map = new Map<string, MonthlyAggregate>();

  for (const entry of timeline) {
    const point = new Date(entry.date);
    const key = `${point.getUTCFullYear()}-${point.getUTCMonth()}`;
    const current = map.get(key);
    if (current) {
      current.resumeCount += entry.resumeCount;
      current.firstRoundCount += entry.firstRoundCount;
      current.secondRoundCount += entry.secondRoundCount;
      current.totalInterviewCount += entry.totalInterviewCount;
      current.rejectCount += entry.rejectCount;
      current.offerCount += entry.offerCount;
      current.offerAcceptedCount += entry.offerAcceptedCount;
      current.femaleCandidates += entry.femaleCandidates;
      current.totalCandidates += entry.totalCandidates;
      current.caseScoreSum += entry.caseScoreSum;
      current.fitScoreSum += entry.fitScoreSum;
      current.scoreCount += entry.scoreCount;
    } else {
      const year = point.getUTCFullYear();
      const month = point.getUTCMonth();
      map.set(key, {
        year,
        month,
        label: formatMonthLabel(year, month),
        resumeCount: entry.resumeCount,
        firstRoundCount: entry.firstRoundCount,
        secondRoundCount: entry.secondRoundCount,
        totalInterviewCount: entry.totalInterviewCount,
        rejectCount: entry.rejectCount,
        offerCount: entry.offerCount,
        offerAcceptedCount: entry.offerAcceptedCount,
        femaleCandidates: entry.femaleCandidates,
        totalCandidates: entry.totalCandidates,
        caseScoreSum: entry.caseScoreSum,
        fitScoreSum: entry.fitScoreSum,
        scoreCount: entry.scoreCount
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
};

const groupByQuarter = (monthly: MonthlyAggregate[]): QuarterAggregate[] => {
  const map = new Map<string, QuarterAggregate>();
  for (const entry of monthly) {
    const quarter = Math.floor(entry.month / 3) + 1;
    const key = `${entry.year}-q${quarter}`;
    const current = map.get(key);
    if (current) {
      current.resumeCount += entry.resumeCount;
      current.firstRoundCount += entry.firstRoundCount;
      current.secondRoundCount += entry.secondRoundCount;
      current.totalInterviewCount += entry.totalInterviewCount;
      current.rejectCount += entry.rejectCount;
      current.offerCount += entry.offerCount;
      current.offerAcceptedCount += entry.offerAcceptedCount;
      current.femaleCandidates += entry.femaleCandidates;
      current.totalCandidates += entry.totalCandidates;
      current.caseScoreSum += entry.caseScoreSum;
      current.fitScoreSum += entry.fitScoreSum;
      current.scoreCount += entry.scoreCount;
    } else {
      map.set(key, {
        year: entry.year,
        quarter,
        label: formatQuarterLabel(entry.year, quarter),
        resumeCount: entry.resumeCount,
        firstRoundCount: entry.firstRoundCount,
        secondRoundCount: entry.secondRoundCount,
        totalInterviewCount: entry.totalInterviewCount,
        rejectCount: entry.rejectCount,
        offerCount: entry.offerCount,
        offerAcceptedCount: entry.offerAcceptedCount,
        femaleCandidates: entry.femaleCandidates,
        totalCandidates: entry.totalCandidates,
        caseScoreSum: entry.caseScoreSum,
        fitScoreSum: entry.fitScoreSum,
        scoreCount: entry.scoreCount
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.year === b.year ? a.quarter - b.quarter : a.year - b.year);
};

const average = (sumValue: number, count: number) => {
  if (count <= 0) {
    return null;
  }
  return sumValue / count;
};

const computeShare = (part: number, whole: number) => {
  if (whole <= 0) {
    return 0;
  }
  return clamp(part / whole, 0, 1);
};

const computeSummaryValue = (items: MonthlyAggregate[]) => {
  const totalCandidates = sum(items.map((item) => item.totalCandidates));
  const femaleShare = computeShare(sum(items.map((item) => item.femaleCandidates)), totalCandidates);
  const offers = sum(items.map((item) => item.offerCount));
  const offerAcceptance = computeShare(sum(items.map((item) => item.offerAcceptedCount)), offers);
  const offerRate = computeShare(offers, totalCandidates);
  return { femaleShare, offerAcceptance, offerRate };
};

const selectMonths = (monthly: MonthlyAggregate[], count: number): MonthlyAggregate[] => {
  if (monthly.length <= count) {
    return monthly;
  }
  return monthly.slice(monthly.length - count);
};

const selectPreviousMonths = (monthly: MonthlyAggregate[], count: number): MonthlyAggregate[] => {
  if (monthly.length <= count) {
    return [];
  }
  return monthly.slice(Math.max(0, monthly.length - count * 2), monthly.length - count);
};

const selectFinancialYear = (
  monthly: MonthlyAggregate[],
  startMonth: number
): { current: MonthlyAggregate[]; previous: MonthlyAggregate[] } => {
  if (!monthly.length) {
    return { current: [], previous: [] };
  }
  const latest = monthly[monthly.length - 1];
  const latestDate = new Date(Date.UTC(latest.year, latest.month, 1));
  const currentYear = latestDate.getUTCMonth() + 1 >= startMonth ? latest.year : latest.year - 1;
  const start = new Date(Date.UTC(currentYear, startMonth - 1, 1));
  const end = new Date(latestDate);
  const current = monthly.filter((item) => {
    const point = new Date(Date.UTC(item.year, item.month, 1));
    return point >= start && point <= end;
  });
  const previousStart = new Date(Date.UTC(currentYear - 1, startMonth - 1, 1));
  const previousEnd = new Date(Date.UTC(currentYear, startMonth - 1, 0));
  const previous = monthly.filter((item) => {
    const point = new Date(Date.UTC(item.year, item.month, 1));
    return point >= previousStart && point <= previousEnd;
  });
  return { current, previous };
};

const buildSummaryCards = (
  monthly: MonthlyAggregate[],
  period: SummaryPeriod,
  financialYearStart: number
): SummaryMetricCard[] => {
  const lastThree = selectMonths(monthly, 3);
  const lastTwelve = selectMonths(monthly, 12);
  const previousThree = selectPreviousMonths(monthly, 3);
  const previousTwelve = selectPreviousMonths(monthly, 12);
  const { current: fyCurrent, previous: fyPrevious } = selectFinancialYear(monthly, financialYearStart);

  const map: Record<SummaryPeriod, { current: MonthlyAggregate[]; previous: MonthlyAggregate[] }> = {
    'rolling-quarter': { current: lastThree, previous: previousThree },
    'rolling-year': { current: lastTwelve, previous: previousTwelve },
    'financial-year': { current: fyCurrent, previous: fyPrevious }
  };

  const target = map[period];
  const currentValues = computeSummaryValue(target.current);
  const previousValues = target.previous.length ? computeSummaryValue(target.previous) : null;

  return [
    {
      key: 'female-share',
      label: 'Доля женщин',
      value: currentValues.femaleShare,
      previousValue: previousValues?.femaleShare ?? null,
      description: 'Соотношение кандидатов женского пола ко всем приглашённым'
    },
    {
      key: 'offer-acceptance',
      label: 'Доля принятых офферов',
      value: currentValues.offerAcceptance,
      previousValue: previousValues?.offerAcceptance ?? null,
      description: 'Отношение принятых офферов к общему числу офферов'
    },
    {
      key: 'offer-rate',
      label: 'Offer rate',
      value: currentValues.offerRate,
      previousValue: previousValues?.offerRate ?? null,
      description: 'Количество офферов по отношению к количеству кандидатов'
    }
  ];
};

const buildSummaryExportRows = (monthly: MonthlyAggregate[]): SummaryMetricExportRow[] =>
  monthly.map((item) => ({
    periodLabel: item.label,
    femaleShare: computeShare(item.femaleCandidates, item.totalCandidates),
    offerAcceptanceRate: computeShare(item.offerAcceptedCount, item.offerCount),
    offerRate: computeShare(item.offerCount, item.totalCandidates)
  }));

const limitLength = <T,>(items: T[], maxLength: number) =>
  items.length <= maxLength ? items : items.slice(items.length - maxLength);

const buildPipelineSeries = (buckets: PipelineBucket[]): PipelineSeries[] => {
  const toPrimary = (selector: (item: typeof buckets[number]) => number): number[] =>
    buckets.map((bucket) => selector(bucket));

  return [
    { key: 'resumes', label: 'Резюме', values: toPrimary((bucket) => bucket.resumeCount) },
    { key: 'first-round', label: 'Интервью 1 раунда', values: toPrimary((bucket) => bucket.firstRoundCount) },
    { key: 'second-round', label: 'Интервью 2 раунда', values: toPrimary((bucket) => bucket.secondRoundCount) },
    { key: 'all-interviews', label: 'Всего интервью', values: toPrimary((bucket) => bucket.totalInterviewCount) },
    { key: 'rejects', label: 'Отказы', values: toPrimary((bucket) => bucket.rejectCount) },
    { key: 'offers', label: 'Офферы', values: toPrimary((bucket) => bucket.offerCount) },
    {
      key: 'female-share',
      label: 'Доля женщин (%)',
      axis: 'secondary',
      values: buckets.map((bucket) =>
        Math.round(computeShare(bucket.femaleCandidates, bucket.totalCandidates) * 1000) / 10
      )
    }
  ];
};

const buildPipelineExportRows = (buckets: PipelineBucket[]): PipelineExportRow[] =>
  buckets.map((bucket) => ({
    period: bucket.label,
    resumes: bucket.resumeCount,
    firstRound: bucket.firstRoundCount,
    secondRound: bucket.secondRoundCount,
    allInterviews: bucket.totalInterviewCount,
    rejects: bucket.rejectCount,
    offers: bucket.offerCount,
    avgCaseScore: average(bucket.caseScoreSum, bucket.scoreCount),
    avgFitScore: average(bucket.fitScoreSum, bucket.scoreCount),
    femaleShare: bucket.totalCandidates > 0
      ? Math.round((bucket.femaleCandidates / bucket.totalCandidates) * 1000) / 10
      : null
  }));

const subtractDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
};

const buildInterviewerSummary = (
  snapshots: InterviewerSnapshot[],
  selectedIds: string[]
): InterviewerSummary[] => {
  if (!snapshots.length) {
    return [];
  }
  const latestDate = snapshots.reduce((acc, entry) => (entry.date > acc ? entry.date : acc), snapshots[0].date);
  const latestPoint = new Date(latestDate);
  const weeklyThreshold = subtractDays(latestPoint, 7);
  const monthlyThreshold = subtractDays(latestPoint, 30);
  const quarterlyThreshold = subtractDays(latestPoint, 91);

  const map = new Map<string, InterviewerSummary & { caseSum: number; fitSum: number; scoreCount: number }>();

  for (const entry of snapshots) {
    if (selectedIds.length && !selectedIds.includes(entry.interviewerId)) {
      continue;
    }
    const point = new Date(entry.date);
    const existing = map.get(entry.interviewerId);
    const base =
      existing ?? {
        id: entry.interviewerId,
        name: entry.interviewerName,
        email: entry.interviewerEmail,
        weeklyInterviews: 0,
        monthlyInterviews: 0,
        quarterlyInterviews: 0,
        caseScoreAverage: null,
        fitScoreAverage: null,
        hireRecommendations: 0,
        rejectRecommendations: 0,
        caseSum: 0,
        fitSum: 0,
        scoreCount: 0
      };

    if (point >= weeklyThreshold) {
      base.weeklyInterviews += entry.interviews;
    }
    if (point >= monthlyThreshold) {
      base.monthlyInterviews += entry.interviews;
    }
    if (point >= quarterlyThreshold) {
      base.quarterlyInterviews += entry.interviews;
      base.hireRecommendations += entry.hireRecommendations;
      base.rejectRecommendations += entry.rejectRecommendations;
      base.caseSum += entry.caseScoreSum;
      base.fitSum += entry.fitScoreSum;
      base.scoreCount += entry.scoreCount;
    }

    map.set(entry.interviewerId, base);
  }

  return Array.from(map.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    email: entry.email,
    weeklyInterviews: entry.weeklyInterviews,
    monthlyInterviews: entry.monthlyInterviews,
    quarterlyInterviews: entry.quarterlyInterviews,
    caseScoreAverage: average(entry.caseSum, entry.scoreCount),
    fitScoreAverage: average(entry.fitSum, entry.scoreCount),
    hireRecommendations: entry.hireRecommendations,
    rejectRecommendations: entry.rejectRecommendations
  }));
};

export interface AnalyticsSummaryResult {
  cards: SummaryMetricCard[];
  exportRows: SummaryMetricExportRow[];
}

export const buildSummaryMetrics = (
  timeline: AnalyticsSnapshot[],
  period: SummaryPeriod,
  financialYearStart: number
): AnalyticsSummaryResult => {
  const monthly = groupByMonth(timeline);
  return {
    cards: buildSummaryCards(monthly, period, financialYearStart),
    exportRows: buildSummaryExportRows(monthly)
  };
};

export const buildPipelineDataset = (
  timeline: AnalyticsSnapshot[],
  view: TimelineView
): PipelineChartDataset => {
  const monthly = groupByMonth(timeline);
  const quarterly = groupByQuarter(monthly);

  if (view === 'weekly') {
    const buckets: PipelineBucket[] = limitLength(
      timeline.map((item) => ({
        label: new Date(item.date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' }),
        resumeCount: item.resumeCount,
        firstRoundCount: item.firstRoundCount,
        secondRoundCount: item.secondRoundCount,
        totalInterviewCount: item.totalInterviewCount,
        rejectCount: item.rejectCount,
        offerCount: item.offerCount,
        offerAcceptedCount: item.offerAcceptedCount,
        femaleCandidates: item.femaleCandidates,
        totalCandidates: item.totalCandidates,
        caseScoreSum: item.caseScoreSum,
        fitScoreSum: item.fitScoreSum,
        scoreCount: item.scoreCount
      })),
      20
    );
    return {
      labels: buckets.map((bucket) => bucket.label),
      series: buildPipelineSeries(buckets),
      exportRows: buildPipelineExportRows(buckets)
    };
  }

  if (view === 'monthly') {
    const buckets: PipelineBucket[] = limitLength(
      monthly.map(({ year, month, ...rest }) => rest),
      18
    );
    return {
      labels: buckets.map((bucket) => bucket.label),
      series: buildPipelineSeries(buckets),
      exportRows: buildPipelineExportRows(buckets)
    };
  }

  const buckets: PipelineBucket[] = limitLength(quarterly, 12).map((item) => ({
    label: item.label,
    resumeCount: item.resumeCount,
    firstRoundCount: item.firstRoundCount,
    secondRoundCount: item.secondRoundCount,
    totalInterviewCount: item.totalInterviewCount,
    rejectCount: item.rejectCount,
    offerCount: item.offerCount,
    offerAcceptedCount: item.offerAcceptedCount,
    femaleCandidates: item.femaleCandidates,
    totalCandidates: item.totalCandidates,
    caseScoreSum: item.caseScoreSum,
    fitScoreSum: item.fitScoreSum,
    scoreCount: item.scoreCount
  }));
  return {
    labels: buckets.map((bucket) => bucket.label),
    series: buildPipelineSeries(buckets),
    exportRows: buildPipelineExportRows(buckets)
  };
};

export const buildInterviewerSummaries = (
  snapshots: InterviewerSnapshot[],
  selectedIds: string[]
): InterviewerSummary[] => {
  const summaries = buildInterviewerSummary(snapshots, selectedIds);
  return summaries.sort((a, b) => b.quarterlyInterviews - a.quarterlyInterviews);
};

export const buildInterviewerExportRows = (summaries: InterviewerSummary[]) =>
  summaries.map((item) => ({
    interviewer: item.name,
    email: item.email,
    weeklyInterviews: item.weeklyInterviews,
    monthlyInterviews: item.monthlyInterviews,
    quarterlyInterviews: item.quarterlyInterviews,
    avgCaseScore: item.caseScoreAverage,
    avgFitScore: item.fitScoreAverage,
    hireRecommendations: item.hireRecommendations,
    rejectRecommendations: item.rejectRecommendations
  }));
