import { CandidateProfile } from '../../../shared/types/candidate';
import { EvaluationConfig, EvaluationRoundSnapshot, InterviewStatusRecord } from '../../../shared/types/evaluation';
import {
  AnalyticsDataset,
  InterviewerAggregateStats,
  InterviewerPeriodStats,
  PipelineMetricsPoint,
  SummaryMetricsByPeriod,
  SummaryMetric,
  SummaryPeriod,
  TimeGranularity
} from '../types';
import {
  clampToPercent,
  formatMonthLabel,
  formatQuarterLabel,
  formatWeekLabel,
  getFiscalYearStart,
  isFemaleGender,
  normalizeDate,
  roundToOneDecimal,
  startOfMonth,
  startOfQuarter,
  startOfWeek
} from './dateUtils';

interface BucketAccumulator {
  start: Date;
  label: string;
  resumes: number;
  firstRoundInterviews: number;
  secondRoundInterviews: number;
  totalInterviews: number;
  rejects: number;
  offers: number;
  acceptedOffers: number;
  caseScoreSum: number;
  caseScoreCount: number;
  fitScoreSum: number;
  fitScoreCount: number;
  intakeCandidates: Set<string>;
  intakeFemaleCandidates: Set<string>;
  activeCandidates: Set<string>;
  activeFemaleCandidates: Set<string>;
}

interface InterviewerSnapshotAccumulator {
  data: InterviewerPeriodStats;
  caseSum: number;
  caseCount: number;
  fitSum: number;
  fitCount: number;
}

interface InterviewerAccumulator {
  interviewerId: string;
  interviewerName: string;
  snapshots: Map<string, InterviewerSnapshotAccumulator>;
  totalCaseSum: number;
  totalCaseCount: number;
  totalFitSum: number;
  totalFitCount: number;
  totalPositive: number;
  totalNegative: number;
}

const ensureBucket = (
  buckets: Map<string, BucketAccumulator>,
  start: Date,
  granularity: TimeGranularity
): BucketAccumulator => {
  const key = start.toISOString();
  const existing = buckets.get(key);
  if (existing) {
    return existing;
  }

  let label: string;
  if (granularity === 'week') {
    label = formatWeekLabel(start);
  } else if (granularity === 'month') {
    label = formatMonthLabel(start);
  } else {
    label = formatQuarterLabel(start);
  }

  const bucket: BucketAccumulator = {
    start,
    label,
    resumes: 0,
    firstRoundInterviews: 0,
    secondRoundInterviews: 0,
    totalInterviews: 0,
    rejects: 0,
    offers: 0,
    acceptedOffers: 0,
    caseScoreSum: 0,
    caseScoreCount: 0,
    fitScoreSum: 0,
    fitScoreCount: 0,
    intakeCandidates: new Set(),
    intakeFemaleCandidates: new Set(),
    activeCandidates: new Set(),
    activeFemaleCandidates: new Set()
  };

  buckets.set(key, bucket);
  return bucket;
};

const getBucketStart = (date: Date, granularity: TimeGranularity): Date => {
  if (granularity === 'week') {
    return startOfWeek(date);
  }
  if (granularity === 'month') {
    return startOfMonth(date);
  }
  return startOfQuarter(date);
};

const addCandidateEvent = (
  bucket: BucketAccumulator,
  candidateId: string,
  isFemale: boolean
) => {
  bucket.resumes += 1;
  bucket.intakeCandidates.add(candidateId);
  bucket.activeCandidates.add(candidateId);
  if (isFemale) {
    bucket.intakeFemaleCandidates.add(candidateId);
    bucket.activeFemaleCandidates.add(candidateId);
  }
};

const addCandidatePresence = (
  bucket: BucketAccumulator,
  candidateId: string,
  isFemale: boolean
) => {
  bucket.activeCandidates.add(candidateId);
  if (isFemale) {
    bucket.activeFemaleCandidates.add(candidateId);
  }
};

const addInterviewEvent = (
  bucket: BucketAccumulator,
  roundNumber: number | undefined,
  candidateId: string | undefined,
  isFemale: boolean,
  form: InterviewStatusRecord
) => {
  bucket.totalInterviews += 1;
  if (roundNumber === 1) {
    bucket.firstRoundInterviews += 1;
  }
  if (roundNumber === 2) {
    bucket.secondRoundInterviews += 1;
  }
  if (candidateId) {
    addCandidatePresence(bucket, candidateId, isFemale);
  }
  if (typeof form.caseScore === 'number' && Number.isFinite(form.caseScore)) {
    bucket.caseScoreSum += form.caseScore;
    bucket.caseScoreCount += 1;
  }
  if (typeof form.fitScore === 'number' && Number.isFinite(form.fitScore)) {
    bucket.fitScoreSum += form.fitScore;
    bucket.fitScoreCount += 1;
  }
};

const addDecisionEvent = (
  bucket: BucketAccumulator,
  candidateId: string | undefined,
  isFemale: boolean,
  decision: EvaluationConfig['decision'],
  acceptedOffer: boolean
) => {
  if (decision === 'offer') {
    bucket.offers += 1;
    if (acceptedOffer) {
      bucket.acceptedOffers += 1;
    }
  }
  if (decision === 'reject') {
    bucket.rejects += 1;
  }
  if (candidateId) {
    addCandidatePresence(bucket, candidateId, isFemale);
  }
};

const collectRounds = (evaluation: EvaluationConfig): EvaluationRoundSnapshot[] => {
  const rounds: EvaluationRoundSnapshot[] = [...evaluation.roundHistory];
  if (evaluation.forms.length > 0) {
    const roundNumber = evaluation.roundNumber ?? (rounds.length > 0 ? rounds[rounds.length - 1].roundNumber + 1 : 1);
    rounds.push({
      roundNumber,
      interviewCount: evaluation.interviewCount,
      interviews: evaluation.interviews,
      forms: evaluation.forms,
      fitQuestionId: evaluation.fitQuestionId,
      processStatus: evaluation.processStatus,
      processStartedAt: evaluation.processStartedAt,
      completedAt: evaluation.updatedAt,
      createdAt: evaluation.createdAt,
      decision: evaluation.decision ?? null
    });
  }
  return rounds;
};

const resolveFormDate = (
  form: InterviewStatusRecord,
  round: EvaluationRoundSnapshot,
  evaluation: EvaluationConfig
): Date | null => {
  return (
    normalizeDate(form.submittedAt) ||
    normalizeDate(round.completedAt) ||
    normalizeDate(evaluation.updatedAt) ||
    normalizeDate(evaluation.createdAt)
  );
};

const resolveDecisionDate = (
  evaluation: EvaluationConfig,
  rounds: EvaluationRoundSnapshot[]
): Date | null => {
  const decision = evaluation.decision;
  if (!decision) {
    return null;
  }
  const targetRound = [...rounds]
    .reverse()
    .find((round) => round.decision === decision && normalizeDate(round.completedAt));
  if (targetRound) {
    return normalizeDate(targetRound.completedAt) ?? null;
  }
  return normalizeDate(evaluation.updatedAt) || normalizeDate(evaluation.createdAt);
};

const isPositiveRecommendation = (value: InterviewStatusRecord['offerRecommendation']): boolean => {
  return value === 'yes_priority' || value === 'yes_strong' || value === 'yes_keep_warm';
};

const inferOfferAcceptance = (evaluation: EvaluationConfig, rounds: EvaluationRoundSnapshot[]): boolean => {
  if (evaluation.decision !== 'offer') {
    return false;
  }
  let positive = 0;
  let negative = 0;
  for (const round of rounds) {
    for (const form of round.forms) {
      if (form.offerRecommendation === 'no_offer') {
        negative += 1;
      }
      if (isPositiveRecommendation(form.offerRecommendation)) {
        positive += 1;
      }
    }
  }
  if (positive === 0) {
    return false;
  }
  return positive >= negative;
};

const toPipelinePoint = (bucket: BucketAccumulator): PipelineMetricsPoint => {
  const avgCase = bucket.caseScoreCount > 0 ? roundToOneDecimal(bucket.caseScoreSum / bucket.caseScoreCount) : null;
  const avgFit = bucket.fitScoreCount > 0 ? roundToOneDecimal(bucket.fitScoreSum / bucket.fitScoreCount) : null;
  const femaleShare = bucket.activeCandidates.size
    ? clampToPercent((bucket.activeFemaleCandidates.size / bucket.activeCandidates.size) * 100)
    : null;
  return {
    start: bucket.start.toISOString(),
    label: bucket.label,
    resumes: bucket.resumes,
    firstRoundInterviews: bucket.firstRoundInterviews,
    secondRoundInterviews: bucket.secondRoundInterviews,
    totalInterviews: bucket.totalInterviews,
    rejects: bucket.rejects,
    offers: bucket.offers,
    avgCaseScore: avgCase,
    avgFitScore: avgFit,
    femaleShare
  };
};

const buildTimeline = (
  candidates: CandidateProfile[],
  evaluations: EvaluationConfig[],
  granularity: TimeGranularity
): { points: PipelineMetricsPoint[]; buckets: BucketAccumulator[] } => {
  const candidateIndex = new Map<string, { isFemale: boolean; createdAt: Date | null }>();
  for (const candidate of candidates) {
    candidateIndex.set(candidate.id, {
      isFemale: isFemaleGender(candidate.gender),
      createdAt: normalizeDate(candidate.createdAt)
    });
  }

  const bucketMap = new Map<string, BucketAccumulator>();

  for (const candidate of candidates) {
    const info = candidateIndex.get(candidate.id);
    if (!info?.createdAt) {
      continue;
    }
    const start = getBucketStart(info.createdAt, granularity);
    const bucket = ensureBucket(bucketMap, start, granularity);
    addCandidateEvent(bucket, candidate.id, info.isFemale);
  }

  for (const evaluation of evaluations) {
    const rounds = collectRounds(evaluation);
    const candidateInfo = evaluation.candidateId ? candidateIndex.get(evaluation.candidateId) : undefined;
    const isFemale = candidateInfo?.isFemale ?? false;

    for (const round of rounds) {
      for (const form of round.forms) {
        const formDate = resolveFormDate(form, round, evaluation);
        if (!formDate) {
          continue;
        }
        const start = getBucketStart(formDate, granularity);
        const bucket = ensureBucket(bucketMap, start, granularity);
        addInterviewEvent(bucket, round.roundNumber, evaluation.candidateId, isFemale, form);
      }
    }

    const decisionDate = resolveDecisionDate(evaluation, rounds);
    if (decisionDate) {
      const start = getBucketStart(decisionDate, granularity);
      const bucket = ensureBucket(bucketMap, start, granularity);
      addDecisionEvent(bucket, evaluation.candidateId, isFemale, evaluation.decision, inferOfferAcceptance(evaluation, rounds));
    }
  }

  const buckets = [...bucketMap.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
  const points = buckets.map((bucket) => toPipelinePoint(bucket));
  return { points, buckets };
};

const computeSummaryMetric = (
  period: SummaryPeriod,
  buckets: BucketAccumulator[]
): SummaryMetric[] => {
  const now = new Date();
  let filtered: BucketAccumulator[] = [];
  if (period === 'rolling-3') {
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    filtered = buckets.filter((bucket) => bucket.start >= cutoff);
  } else if (period === 'rolling-12') {
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    filtered = buckets.filter((bucket) => bucket.start >= cutoff);
  } else {
    const fyStart = getFiscalYearStart(now);
    filtered = buckets.filter((bucket) => bucket.start >= fyStart);
  }
  if (!filtered.length) {
    return [
      { id: 'female-share', label: 'Доля женщин', value: null, trendLabel: 'Нет данных' },
      { id: 'offer-acceptance', label: 'Доля принятых офферов', value: null, trendLabel: 'Нет данных' },
      { id: 'offer-rate', label: 'Offer rate', value: null, trendLabel: 'Нет данных' }
    ];
  }

  const intakeCandidates = new Set<string>();
  const intakeFemale = new Set<string>();
  let offers = 0;
  let acceptedOffers = 0;
  const pipelineCandidates = new Set<string>();
  const pipelineFemale = new Set<string>();

  for (const bucket of filtered) {
    bucket.intakeCandidates.forEach((id) => intakeCandidates.add(id));
    bucket.intakeFemaleCandidates.forEach((id) => intakeFemale.add(id));
    bucket.activeCandidates.forEach((id) => pipelineCandidates.add(id));
    bucket.activeFemaleCandidates.forEach((id) => pipelineFemale.add(id));
    offers += bucket.offers;
    acceptedOffers += bucket.acceptedOffers;
  }

  const femaleShare = intakeCandidates.size
    ? clampToPercent((intakeFemale.size / intakeCandidates.size) * 100)
    : null;
  const offerRate = intakeCandidates.size ? clampToPercent((offers / intakeCandidates.size) * 100) : null;
  const acceptanceRate = offers > 0 ? clampToPercent((acceptedOffers / offers) * 100) : null;

  const buildTrendLabel = (value: number | null) => {
    if (value === null) {
      return 'Нет данных';
    }
    if (value >= 100) {
      return '≈100%';
    }
    if (value <= 0) {
      return '≈0%';
    }
    return `${Math.round(value)}%`;
  };

  return [
    {
      id: 'female-share',
      label: 'Доля женщин',
      value: femaleShare,
      trendLabel: buildTrendLabel(femaleShare)
    },
    {
      id: 'offer-acceptance',
      label: 'Доля принятых офферов',
      value: acceptanceRate,
      trendLabel: buildTrendLabel(acceptanceRate)
    },
    {
      id: 'offer-rate',
      label: 'Offer rate',
      value: offerRate,
      trendLabel: buildTrendLabel(offerRate)
    }
  ];
};

const mergeSnapshot = (
  accumulator: InterviewerAccumulator,
  start: Date,
  label: string,
  form: InterviewStatusRecord
) => {
  const key = start.toISOString();
  let snapshot = accumulator.snapshots.get(key);
  if (!snapshot) {
    snapshot = {
      data: {
        start: start.toISOString(),
        label,
        interviews: 0,
        avgCaseScore: null,
        avgFitScore: null,
        positiveDecisions: 0,
        negativeDecisions: 0
      },
      caseSum: 0,
      caseCount: 0,
      fitSum: 0,
      fitCount: 0
    };
    accumulator.snapshots.set(key, snapshot);
  }
  snapshot.data.interviews += 1;

  const caseScore = typeof form.caseScore === 'number' && Number.isFinite(form.caseScore) ? form.caseScore : null;
  if (caseScore !== null) {
    accumulator.totalCaseSum += caseScore;
    accumulator.totalCaseCount += 1;
    snapshot.caseSum += caseScore;
    snapshot.caseCount += 1;
  }
  const fitScore = typeof form.fitScore === 'number' && Number.isFinite(form.fitScore) ? form.fitScore : null;
  if (fitScore !== null) {
    accumulator.totalFitSum += fitScore;
    accumulator.totalFitCount += 1;
    snapshot.fitSum += fitScore;
    snapshot.fitCount += 1;
  }

  if (form.offerRecommendation === 'no_offer') {
    accumulator.totalNegative += 1;
    snapshot.data.negativeDecisions += 1;
  }
  if (isPositiveRecommendation(form.offerRecommendation)) {
    accumulator.totalPositive += 1;
    snapshot.data.positiveDecisions += 1;
  }
};

const buildInterviewerAnalytics = (
  evaluations: EvaluationConfig[],
  granularity: TimeGranularity
): InterviewerAggregateStats[] => {
  const interviewerMap = new Map<string, InterviewerAccumulator>();

  const resolveInterviewer = (
    slotId: string,
    round: EvaluationRoundSnapshot,
    evaluation: EvaluationConfig
  ): { id: string; name: string } | null => {
    const searchSets = [round.interviews, evaluation.interviews];
    for (const set of searchSets) {
      const match = set.find((slot) => slot.id === slotId);
      if (match) {
        const id = match.interviewerEmail || match.id;
        const name = match.interviewerName || match.interviewerEmail || match.id;
        return { id, name };
      }
    }
    for (const past of evaluation.roundHistory) {
      const match = past.interviews.find((slot) => slot.id === slotId);
      if (match) {
        const id = match.interviewerEmail || match.id;
        const name = match.interviewerName || match.interviewerEmail || match.id;
        return { id, name };
      }
    }
    return null;
  };

  for (const evaluation of evaluations) {
    const rounds = collectRounds(evaluation);
    for (const round of rounds) {
      for (const form of round.forms) {
        const resolved = resolveInterviewer(form.slotId, round, evaluation);
        if (!resolved) {
          continue;
        }
        const date = resolveFormDate(form, round, evaluation);
        if (!date) {
          continue;
        }
        const start = getBucketStart(date, granularity);
        const label =
          granularity === 'week'
            ? formatWeekLabel(start)
            : granularity === 'month'
            ? formatMonthLabel(start)
            : formatQuarterLabel(start);
        const key = resolved.id;
        let acc = interviewerMap.get(key);
        if (!acc) {
          acc = {
            interviewerId: key,
            interviewerName: resolved.name,
            snapshots: new Map(),
            totalCaseSum: 0,
            totalCaseCount: 0,
            totalFitSum: 0,
            totalFitCount: 0,
            totalPositive: 0,
            totalNegative: 0
          };
          interviewerMap.set(key, acc);
        }
        mergeSnapshot(acc, start, label, form);
      }
    }
  }

  const results: InterviewerAggregateStats[] = [];
  interviewerMap.forEach((acc) => {
    const snapshots = [...acc.snapshots.values()].sort((a, b) => a.data.start.localeCompare(b.data.start));
    const formattedSnapshots: InterviewerPeriodStats[] = snapshots.map((snapshot) => ({
      ...snapshot.data,
      avgCaseScore: snapshot.caseCount > 0 ? roundToOneDecimal(snapshot.caseSum / snapshot.caseCount) : null,
      avgFitScore: snapshot.fitCount > 0 ? roundToOneDecimal(snapshot.fitSum / snapshot.fitCount) : null
    }));

    const totals: InterviewerAggregateStats['totals'] = {
      interviews: formattedSnapshots.reduce((sum, item) => sum + item.interviews, 0),
      avgCaseScore: acc.totalCaseCount > 0 ? roundToOneDecimal(acc.totalCaseSum / acc.totalCaseCount) : null,
      avgFitScore: acc.totalFitCount > 0 ? roundToOneDecimal(acc.totalFitSum / acc.totalFitCount) : null,
      positiveDecisions: acc.totalPositive,
      negativeDecisions: acc.totalNegative
    };

    results.push({
      interviewerId: acc.interviewerId,
      interviewerName: acc.interviewerName,
      snapshots: formattedSnapshots,
      totals
    });
  });

  return results.sort((a, b) => a.interviewerName.localeCompare(b.interviewerName, 'ru'));
};

export const buildAnalyticsDataset = (
  candidates: CandidateProfile[],
  evaluations: EvaluationConfig[]
): AnalyticsDataset => {
  const monthly = buildTimeline(candidates, evaluations, 'month');
  const weekly = buildTimeline(candidates, evaluations, 'week');
  const quarterly = buildTimeline(candidates, evaluations, 'quarter');

  const summaries: SummaryMetricsByPeriod[] = (
    ['rolling-3', 'fy-to-date', 'rolling-12'] as SummaryPeriod[]
  ).map((period) => ({ period, metrics: computeSummaryMetric(period, monthly.buckets) }));

  const timelines: Record<TimeGranularity, { granularity: TimeGranularity; points: PipelineMetricsPoint[] }> = {
    week: { granularity: 'week', points: weekly.points },
    month: { granularity: 'month', points: monthly.points },
    quarter: { granularity: 'quarter', points: quarterly.points }
  };

  const interviewers = buildInterviewerAnalytics(evaluations, 'week');

  return {
    summaries,
    timelines,
    interviewers,
    source: { candidates, evaluations }
  };
};
