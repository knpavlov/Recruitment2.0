import type { InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';

export interface InterviewerGraphBucketPoint {
  bucket: string;
  interviews: number;
  interviewerCount: number;
  hireShare: number;
  hireShareSamples: number;
  caseScore: number;
  caseScoreSamples: number;
  fitScore: number;
  fitScoreSamples: number;
}

// Выравниваем дату к началу нужного периода, чтобы построить непрерывную шкалу
const alignToBucketStart = (value: Date, groupBy: TimelineGrouping) => {
  const aligned = new Date(value.getTime());
  if (Number.isNaN(aligned.getTime())) {
    return aligned;
  }
  switch (groupBy) {
    case 'week': {
      const day = aligned.getUTCDay();
      const diff = (day + 6) % 7;
      aligned.setUTCDate(aligned.getUTCDate() - diff);
      aligned.setUTCHours(0, 0, 0, 0);
      return aligned;
    }
    case 'quarter': {
      const month = aligned.getUTCMonth();
      const quarterStart = month - (month % 3);
      aligned.setUTCMonth(quarterStart, 1);
      aligned.setUTCHours(0, 0, 0, 0);
      return aligned;
    }
    case 'month':
    default: {
      aligned.setUTCDate(1);
      aligned.setUTCHours(0, 0, 0, 0);
      return aligned;
    }
  }
};

// Сдвигаем указатель на следующий период в зависимости от группировки
const advanceBucket = (value: Date, groupBy: TimelineGrouping) => {
  const next = new Date(value.getTime());
  switch (groupBy) {
    case 'week':
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case 'quarter':
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case 'month':
    default:
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
  }
};

export const buildBucketSequence = (
  startIso: string,
  endIso: string,
  groupBy: TimelineGrouping
): string[] => {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }
  const buckets: string[] = [];
  let cursor = alignToBucketStart(startDate, groupBy);
  const alignedEnd = alignToBucketStart(endDate, groupBy);
  while (cursor.getTime() <= alignedEnd.getTime()) {
    buckets.push(cursor.toISOString());
    cursor = advanceBucket(cursor, groupBy);
  }
  return buckets;
};

export const aggregateInterviewerGraphBuckets = (
  data: InterviewerStatsResponse
): InterviewerGraphBucketPoint[] => {
  const bucketsByKey = new Map<string, typeof data.buckets>();
  data.buckets.forEach((entry) => {
    const existing = bucketsByKey.get(entry.bucket) ?? [];
    existing.push(entry);
    bucketsByKey.set(entry.bucket, existing);
  });

  const sequence = buildBucketSequence(data.range.start, data.range.end, data.groupBy);

  return sequence.map((bucketKey) => {
    const entries = bucketsByKey.get(bucketKey) ?? [];
    const interviewerCount = entries.length;

    let interviewSum = 0;
    let hireShareSum = 0;
    let hireShareSamples = 0;
    let caseScoreWeighted = 0;
    let caseScoreSamples = 0;
    let fitScoreWeighted = 0;
    let fitScoreSamples = 0;

    entries.forEach((item) => {
      interviewSum += item.interviewCount;
      const decisions = item.hireRecommendations + item.rejectRecommendations;
      if (decisions > 0) {
        hireShareSum += item.hireRecommendations / decisions;
        hireShareSamples += 1;
      }
      if (item.avgCaseScore != null && item.caseScoreCount > 0) {
        caseScoreWeighted += item.avgCaseScore * item.caseScoreCount;
        caseScoreSamples += item.caseScoreCount;
      }
      if (item.avgFitScore != null && item.fitScoreCount > 0) {
        fitScoreWeighted += item.avgFitScore * item.fitScoreCount;
        fitScoreSamples += item.fitScoreCount;
      }
    });

    const averageInterviews = interviewerCount ? interviewSum / interviewerCount : 0;
    const averageHireShare = hireShareSamples ? hireShareSum / hireShareSamples : 0;
    const averageCaseScore = caseScoreSamples ? caseScoreWeighted / caseScoreSamples : 0;
    const averageFitScore = fitScoreSamples ? fitScoreWeighted / fitScoreSamples : 0;

    return {
      bucket: bucketKey,
      interviews: averageInterviews,
      interviewerCount,
      hireShare: averageHireShare,
      hireShareSamples,
      caseScore: averageCaseScore,
      caseScoreSamples,
      fitScore: averageFitScore,
      fitScoreSamples
    };
  });
};
