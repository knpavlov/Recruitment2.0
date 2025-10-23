import type { InterviewerStatsResponse } from '../types/analytics';

export interface InterviewerTimelinePoint {
  bucket: string;
  interviewCount: number;
  hire: number;
  reject: number;
  caseScoreSum: number;
  caseScoreCount: number;
  fitScoreSum: number;
  fitScoreCount: number;
}

export const buildInterviewerTimeline = (data: InterviewerStatsResponse | null): InterviewerTimelinePoint[] => {
  if (!data) {
    return [];
  }

  const map = new Map<string, InterviewerTimelinePoint>();

  for (const bucket of data.buckets) {
    const existing = map.get(bucket.bucket) ?? {
      bucket: bucket.bucket,
      interviewCount: 0,
      hire: 0,
      reject: 0,
      caseScoreSum: 0,
      caseScoreCount: 0,
      fitScoreSum: 0,
      fitScoreCount: 0
    };

    existing.interviewCount += bucket.interviewCount;
    existing.hire += bucket.hireRecommendations;
    existing.reject += bucket.rejectRecommendations;

    if (bucket.avgCaseScore != null) {
      existing.caseScoreSum += bucket.avgCaseScore * bucket.caseScoreCount;
      existing.caseScoreCount += bucket.caseScoreCount;
    }

    if (bucket.avgFitScore != null) {
      existing.fitScoreSum += bucket.avgFitScore * bucket.fitScoreCount;
      existing.fitScoreCount += bucket.fitScoreCount;
    }

    map.set(bucket.bucket, existing);
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime());
};
