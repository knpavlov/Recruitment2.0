import type { InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';

export type GraphPoint = {
  bucket: string;
  interviews: number;
  hireShare: number;
  caseScore: number;
  fitScore: number;
};

const RANGE_LABEL_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export const formatBucketLabel = (bucket: string, groupBy: TimelineGrouping) => {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) {
    return bucket;
  }
  if (groupBy === 'quarter') {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    return `Q${quarter} ${date.getUTCFullYear()}`;
  }
  if (groupBy === 'week') {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};

export const formatRangeDescription = (
  start: string | undefined,
  end: string | undefined,
  groupingLabel: string
) => {
  const safeStart = start ? new Date(start) : null;
  const safeEnd = end ? new Date(end) : null;

  const hasValidStart = safeStart && !Number.isNaN(safeStart.getTime());
  const hasValidEnd = safeEnd && !Number.isNaN(safeEnd.getTime());

  if (hasValidStart && hasValidEnd) {
    return `${groupingLabel} averages from ${RANGE_LABEL_FORMATTER.format(safeStart!)} to ${RANGE_LABEL_FORMATTER.format(
      safeEnd!
    )}`;
  }

  if (hasValidStart) {
    return `${groupingLabel} averages since ${RANGE_LABEL_FORMATTER.format(safeStart!)}`;
  }

  if (hasValidEnd) {
    return `${groupingLabel} averages until ${RANGE_LABEL_FORMATTER.format(safeEnd!)}`;
  }

  return `${groupingLabel} averages for the available data range`;
};

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

export const buildBucketSequence = (startIso: string, endIso: string, groupBy: TimelineGrouping) => {
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

export const buildGraphPoints = (data: InterviewerStatsResponse | null): GraphPoint[] => {
  if (!data) {
    return [];
  }

  const byBucket = new Map<string, typeof data.buckets>();
  data.buckets.forEach((bucket) => {
    const existing = byBucket.get(bucket.bucket) ?? [];
    existing.push(bucket);
    byBucket.set(bucket.bucket, existing);
  });

  const sequence = buildBucketSequence(data.range.start, data.range.end, data.groupBy);

  return sequence.map((bucketKey) => {
    const bucketEntries = byBucket.get(bucketKey) ?? [];
    const interviewerCount = bucketEntries.length;

    let interviewSum = 0;
    let hireShareSum = 0;
    let hireShareCount = 0;
    let caseScoreWeighted = 0;
    let caseScoreCount = 0;
    let fitScoreWeighted = 0;
    let fitScoreCount = 0;

    bucketEntries.forEach((entry) => {
      interviewSum += entry.interviewCount;
      const decisions = entry.hireRecommendations + entry.rejectRecommendations;
      if (decisions > 0) {
        hireShareSum += entry.hireRecommendations / decisions;
        hireShareCount += 1;
      }
      if (entry.avgCaseScore != null && entry.caseScoreCount > 0) {
        caseScoreWeighted += entry.avgCaseScore * entry.caseScoreCount;
        caseScoreCount += entry.caseScoreCount;
      }
      if (entry.avgFitScore != null && entry.fitScoreCount > 0) {
        fitScoreWeighted += entry.avgFitScore * entry.fitScoreCount;
        fitScoreCount += entry.fitScoreCount;
      }
    });

    const averageInterviews = interviewerCount ? interviewSum / interviewerCount : 0;
    const averageHireShare = hireShareCount ? hireShareSum / hireShareCount : 0;
    const averageCaseScore = caseScoreCount ? caseScoreWeighted / caseScoreCount : 0;
    const averageFitScore = fitScoreCount ? fitScoreWeighted / fitScoreCount : 0;

    return {
      bucket: bucketKey,
      interviews: averageInterviews,
      hireShare: averageHireShare,
      caseScore: averageCaseScore,
      fitScore: averageFitScore
    };
  });
};

const toCsvValue = (value: string | number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const createGraphCsv = (data: InterviewerStatsResponse) => {
  const points = buildGraphPoints(data);
  const groupBy = data.groupBy;
  const rows: string[] = [];
  rows.push('bucket_start,bucket_end,average_interviews,average_case_score,average_fit_score,average_hire_share_percent');

  points.forEach((point) => {
    const bucketStart = new Date(point.bucket);
    if (Number.isNaN(bucketStart.getTime())) {
      return;
    }
    const bucketEnd = advanceBucket(bucketStart, groupBy);
    const formatted = [
      bucketStart.toISOString(),
      bucketEnd.toISOString(),
      Number.isFinite(point.interviews) ? point.interviews.toFixed(2) : '',
      Number.isFinite(point.caseScore) ? point.caseScore.toFixed(2) : '',
      Number.isFinite(point.fitScore) ? point.fitScore.toFixed(2) : '',
      Number.isFinite(point.hireShare) ? (point.hireShare * 100).toFixed(2) : ''
    ].map(toCsvValue);
    rows.push(formatted.join(','));
  });

  return rows.join('\n');
};

export const downloadGraphCsv = (data: InterviewerStatsResponse) => {
  const csvContent = createGraphCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `interviewer-performance-${data.groupBy}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
