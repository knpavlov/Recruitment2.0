import { useMemo } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';
import { TimelineChart, SeriesConfig } from './TimelineChart';

interface InterviewerTrendsSectionProps {
  period: InterviewerPeriod;
  range: { from: string; to: string };
  data: InterviewerStatsResponse | null;
  selectedInterviewers: string[];
  loading: boolean;
  error: string | null;
}

type InterviewerTrendPoint = {
  bucket: string;
  interviewCount: number;
  hireShare: number | null;
  avgCaseScore: number | null;
  avgFitScore: number | null;
};

const PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  fytd: 'Fiscal year to date',
  rolling_12: 'Rolling 12 months'
};

const SERIES: SeriesConfig<InterviewerTrendPoint>[] = [
  { key: 'interviewCount', label: 'Interviews', color: '#6366f1', type: 'count' },
  { key: 'hireShare', label: 'Hire share', color: '#10b981', type: 'percentage' },
  { key: 'avgCaseScore', label: 'Case score', color: '#a855f7', type: 'score' },
  { key: 'avgFitScore', label: 'Fit score', color: '#ec4899', type: 'score' }
];

export const InterviewerTrendsSection = ({
  period,
  range,
  data,
  selectedInterviewers,
  loading,
  error
}: InterviewerTrendsSectionProps) => {
  const points = useMemo(() => {
    if (!data) {
      return [] as InterviewerTrendPoint[];
    }
    const filterSet = selectedInterviewers.length
      ? new Set(selectedInterviewers.map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0))
      : null;

    const buckets = new Map<
      string,
      {
        interviews: number;
        hire: number;
        reject: number;
        caseSum: number;
        caseCount: number;
        fitSum: number;
        fitCount: number;
      }
    >();

    data.buckets.forEach((bucket) => {
      if (filterSet && !filterSet.has(bucket.interviewerId.trim().toLowerCase())) {
        return;
      }
      const entry = buckets.get(bucket.bucket) ?? {
        interviews: 0,
        hire: 0,
        reject: 0,
        caseSum: 0,
        caseCount: 0,
        fitSum: 0,
        fitCount: 0
      };
      entry.interviews += bucket.interviewCount;
      entry.hire += bucket.hireRecommendations;
      entry.reject += bucket.rejectRecommendations;
      if (bucket.avgCaseScore != null) {
        entry.caseSum += bucket.avgCaseScore * bucket.caseScoreCount;
        entry.caseCount += bucket.caseScoreCount;
      }
      if (bucket.avgFitScore != null) {
        entry.fitSum += bucket.avgFitScore * bucket.fitScoreCount;
        entry.fitCount += bucket.fitScoreCount;
      }
      buckets.set(bucket.bucket, entry);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map<InterviewerTrendPoint>(([bucketKey, entry]) => {
        const decisions = entry.hire + entry.reject;
        return {
          bucket: bucketKey,
          interviewCount: entry.interviews,
          hireShare: decisions ? entry.hire / decisions : null,
          avgCaseScore: entry.caseCount ? entry.caseSum / entry.caseCount : null,
          avgFitScore: entry.fitCount ? entry.fitSum / entry.fitCount : null
        };
      });
  }, [data, selectedInterviewers]);

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer trends</h2>
          <p className={styles.metricDetails}>
            {PERIOD_LABELS[period]} · {range.from} → {range.to}
          </p>
        </div>
      </header>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Preparing trend lines…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <TimelineChart
            points={points}
            series={SERIES}
            ariaLabel="Interviewer performance trends"
          />
        ) : (
          <div className={styles.timelineEmpty}>No interviewer trends for the selected filters.</div>
        )
      ) : null}
    </section>
  );
};
