import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { INTERVIEWER_PERIOD_LABELS } from '../constants/interviewers';
import type { InterviewerPeriod, InterviewerStatsResponse, TimelinePoint } from '../types/analytics';
import { TimelineChart, SeriesConfig } from './TimelineChart';

interface InterviewerTrendsSectionProps {
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  period: InterviewerPeriod;
  selectedInterviewer: 'all' | string;
}

const TREND_SERIES: SeriesConfig[] = [
  { key: 'totalInterviews', label: 'Completed interviews', color: '#6366f1', type: 'count' },
  { key: 'hireShare', label: 'Hire share', color: '#22c55e', type: 'percentage' },
  { key: 'avgCaseScore', label: 'Average case score', color: '#a855f7', type: 'score' },
  { key: 'avgFitScore', label: 'Average fit score', color: '#ec4899', type: 'score' }
];

const normalizeId = (id: string) => id.toLowerCase();

const sortBuckets = (values: Iterable<string>) => {
  return Array.from(values).sort((a, b) => {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return a.localeCompare(b);
    }
    return timeA - timeB;
  });
};

export const InterviewerTrendsSection = ({
  data,
  loading,
  error,
  period,
  selectedInterviewer
}: InterviewerTrendsSectionProps) => {
  const [selectedSeries, setSelectedSeries] = useState<SeriesConfig['key'][]>(() =>
    TREND_SERIES.map((series) => series.key)
  );

  const activeSeries = useMemo(
    () => TREND_SERIES.filter((series) => selectedSeries.includes(series.key)),
    [selectedSeries]
  );

  const points = useMemo<TimelinePoint[]>(() => {
    if (!data) {
      return [];
    }
    const filterId = selectedInterviewer === 'all' ? null : normalizeId(selectedInterviewer);
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

    for (const bucket of data.buckets) {
      if (filterId && normalizeId(bucket.interviewerId) !== filterId) {
        continue;
      }
      const current =
        buckets.get(bucket.bucket) ?? {
          interviews: 0,
          hire: 0,
          reject: 0,
          caseSum: 0,
          caseCount: 0,
          fitSum: 0,
          fitCount: 0
        };
      current.interviews += bucket.interviewCount;
      current.hire += bucket.hireRecommendations;
      current.reject += bucket.rejectRecommendations;
      if (bucket.avgCaseScore != null && bucket.caseScoreCount) {
        current.caseSum += bucket.avgCaseScore * bucket.caseScoreCount;
        current.caseCount += bucket.caseScoreCount;
      }
      if (bucket.avgFitScore != null && bucket.fitScoreCount) {
        current.fitSum += bucket.avgFitScore * bucket.fitScoreCount;
        current.fitCount += bucket.fitScoreCount;
      }
      buckets.set(bucket.bucket, current);
    }

    const orderedBuckets = sortBuckets(buckets.keys());

    return orderedBuckets.map((bucketKey) => {
      const value = buckets.get(bucketKey)!;
      const decisions = value.hire + value.reject;
      return {
        bucket: bucketKey,
        resumes: 0,
        firstRoundInterviews: 0,
        secondRoundInterviews: 0,
        totalInterviews: value.interviews,
        rejects: 0,
        offers: 0,
        avgCaseScore: value.caseCount ? value.caseSum / value.caseCount : null,
        avgFitScore: value.fitCount ? value.fitSum / value.fitCount : null,
        femaleShare: null,
        hireShare: decisions ? value.hire / decisions : null
      };
    });
  }, [data, selectedInterviewer]);

  const selectedLabel = useMemo(() => {
    if (!data || selectedInterviewer === 'all') {
      return 'All interviewers';
    }
    const match = data.interviewers.find(
      (interviewer) => normalizeId(interviewer.id) === normalizeId(selectedInterviewer)
    );
    return match ? match.name : selectedInterviewer;
  }, [data, selectedInterviewer]);

  const toggleSeries = (key: SeriesConfig['key']) => {
    setSelectedSeries((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer trendlines</h2>
          <p className={styles.metricDetails}>
            Time-series view for interview volume, hire share, and quality signals
          </p>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <span className={styles.metricDetails}>
          Period: {INTERVIEWER_PERIOD_LABELS[period]}
        </span>
        <span className={styles.metricDetails}>
          Focus: {selectedLabel}
        </span>
      </div>

      <div className={styles.checkboxGroup}>
        {TREND_SERIES.map((series) => {
          const isActive = selectedSeries.includes(series.key);
          return (
            <label
              key={series.key}
              className={`${styles.checkboxOption} ${isActive ? styles.checkboxOptionActive : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggleSeries(series.key)}
              />
              <span style={{ color: series.color, fontWeight: 600 }}>{series.label}</span>
            </label>
          );
        })}
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Building interviewer chart…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <TimelineChart points={points} series={activeSeries} />
        ) : (
          <div className={styles.timelineEmpty}>No timeline data for the selected filters.</div>
        )
      ) : null}
    </section>
  );
};
