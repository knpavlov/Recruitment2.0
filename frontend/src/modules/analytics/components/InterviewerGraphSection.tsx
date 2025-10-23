import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';
import type { InterviewerSeniority } from '../../../shared/types/account';
import { InterviewerFilters } from './InterviewerFilters';

const PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  rolling_3: 'Trailing 3 months',
  fytd: 'Financial year to date',
  rolling_12: 'Trailing 12 months'
};

const PERIOD_ORDER: InterviewerPeriod[] = ['last_month', 'rolling_3', 'fytd', 'rolling_12'];

const GROUPING_LABELS: Record<TimelineGrouping, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly'
};

interface InterviewerGraphSectionProps {
  period: InterviewerPeriod;
  onPeriodChange: (value: InterviewerPeriod) => void;
  groupBy: TimelineGrouping;
  onGroupingChange: (value: TimelineGrouping) => void;
  selectedInterviewers: string[];
  onInterviewerChange: (ids: string[]) => void;
  selectedRoles: InterviewerSeniority[];
  onRoleChange: (roles: InterviewerSeniority[]) => void;
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
}

const WIDTH = 960;
const HEIGHT = 320;
const PADDING_X = 64;
const PADDING_Y = 40;
const MAX_SCORE = 5;

const SERIES = [
  {
    key: 'interviews',
    label: 'Interviews completed',
    color: '#6366f1',
    domain: 'count' as const
  },
  {
    key: 'hireShare',
    label: 'Hire share',
    color: '#22c55e',
    domain: 'percentage' as const
  },
  {
    key: 'caseScore',
    label: 'Average case score',
    color: '#0ea5e9',
    domain: 'score' as const
  },
  {
    key: 'fitScore',
    label: 'Average fit score',
    color: '#ec4899',
    domain: 'score' as const
  }
];

type SeriesKey = (typeof SERIES)[number]['key'];

type ChartPoint = {
  bucket: string;
  label: string;
  interviews: number;
  hireShare: number;
  caseScore: number;
  fitScore: number;
};

const valueAccessors: Record<SeriesKey, (point: ChartPoint) => number> = {
  interviews: (point) => point.interviews,
  hireShare: (point) => point.hireShare,
  caseScore: (point) => point.caseScore,
  fitScore: (point) => point.fitScore
};

const normalizeValue = (point: ChartPoint, key: SeriesKey, maxCount: number) => {
  const raw = valueAccessors[key](point);
  switch (key) {
    case 'interviews':
      return maxCount ? raw / maxCount : 0;
    case 'hireShare':
      return raw;
    case 'caseScore':
    case 'fitScore':
      return raw / MAX_SCORE;
    default:
      return 0;
  }
};

const formatBucketLabel = (bucket: string, groupBy: TimelineGrouping) => {
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

export const InterviewerGraphSection = ({
  period,
  onPeriodChange,
  groupBy,
  onGroupingChange,
  selectedInterviewers,
  onInterviewerChange,
  selectedRoles,
  onRoleChange,
  data,
  loading,
  error
}: InterviewerGraphSectionProps) => {
  const points = useMemo<ChartPoint[]>(() => {
    if (!data) {
      return [];
    }
    const aggregates = new Map<
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
      const entry = aggregates.get(bucket.bucket) ?? {
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

      aggregates.set(bucket.bucket, entry);
    });

    return Array.from(aggregates.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([bucketKey, values]) => {
        const decisionTotal = values.hire + values.reject;
        return {
          bucket: bucketKey,
          label: formatBucketLabel(bucketKey, data.groupBy),
          interviews: values.interviews,
          hireShare: decisionTotal ? values.hire / decisionTotal : 0,
          caseScore: values.caseCount ? values.caseSum / values.caseCount : 0,
          fitScore: values.fitCount ? values.fitSum / values.fitCount : 0
        };
      });
  }, [data]);

  const [selectedMetric, setSelectedMetric] = useState<SeriesKey>('interviews');

  const maxInterviews = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    return Math.max(...points.map((point) => point.interviews));
  }, [points]);

  const activeSeries = SERIES.find((item) => item.key === selectedMetric) ?? SERIES[0];

  const domainMax = activeSeries.domain === 'count' ? maxInterviews : activeSeries.domain === 'score' ? MAX_SCORE : 1;

  const xPositions = useMemo(() => {
    if (points.length <= 1) {
      return points.map(() => WIDTH / 2);
    }
    const availableWidth = WIDTH - PADDING_X * 2;
    return points.map((_, index) => PADDING_X + (index / (points.length - 1)) * availableWidth);
  }, [points]);

  const buildPath = () => {
    const values = points.map((point) => normalizeValue(point, activeSeries.key, maxInterviews));
    let path = '';
    let moveTo = true;
    values.forEach((value, index) => {
      const x = xPositions[index];
      const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
      if (Number.isNaN(y)) {
        return;
      }
      if (moveTo) {
        path += `M ${x} ${y}`;
        moveTo = false;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return path
      ? (
          <path
            key={activeSeries.key}
            d={path}
            fill="none"
            stroke={activeSeries.color}
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )
      : null;
  };

  const formatTick = (fraction: number) => {
    if (activeSeries.domain === 'count') {
      const value = domainMax * fraction;
      return Math.round(value).toString();
    }
    if (activeSeries.domain === 'score') {
      const value = domainMax * fraction;
      return value.toFixed(1);
    }
    return `${Math.round(fraction * 100)}%`;
  };

  const rangeStart = data ? data.range.start.slice(0, 10) : '';
  const rangeEnd = data ? data.range.end.slice(0, 10) : '';

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer performance graph</h2>
          <p className={styles.metricDetails}>Comparative view across interviewers for {PERIOD_LABELS[period]}</p>
        </div>
      </header>

      <InterviewerFilters
        interviewers={data?.interviewers ?? []}
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={onInterviewerChange}
        selectedRoles={selectedRoles}
        onRoleChange={onRoleChange}
        disabled={loading}
      />

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-graph-grouping">
            Aggregation period
          </label>
          <select
            id="interviewer-graph-grouping"
            className={styles.select}
            value={groupBy}
            onChange={(event) => onGroupingChange(event.target.value as TimelineGrouping)}
            disabled={loading}
          >
            {Object.entries(GROUPING_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-graph-period">
            Range preset
          </label>
          <select
            id="interviewer-graph-period"
            className={styles.select}
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as InterviewerPeriod)}
            disabled={loading}
          >
            {PERIOD_ORDER.map((option) => (
              <option key={option} value={option}>
                {PERIOD_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-graph-from">
            Range start
          </label>
          <input
            id="interviewer-graph-from"
            type="date"
            className={styles.dateInput}
            value={rangeStart}
            readOnly
            disabled
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-graph-to">
            Range end
          </label>
          <input
            id="interviewer-graph-to"
            type="date"
            className={styles.dateInput}
            value={rangeEnd}
            readOnly
            disabled
          />
        </div>
      </div>

      <div className={styles.metricToggleRow}>
        {SERIES.map((series) => (
          <button
            key={series.key}
            type="button"
            className={`${styles.metricToggle} ${selectedMetric === series.key ? styles.metricToggleActive : ''}`}
            onClick={() => setSelectedMetric(series.key)}
            disabled={!points.length}
          >
            <span style={{ color: series.color }}>{series.label}</span>
          </button>
        ))}
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Loading chart…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <div className={styles.timelineWrapper}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              role="img"
              aria-label="Interviewer comparison chart"
            >
              <line
                x1={PADDING_X}
                y1={HEIGHT - PADDING_Y}
                x2={WIDTH - PADDING_X}
                y2={HEIGHT - PADDING_Y}
                stroke="rgba(148,163,184,0.6)"
                strokeWidth={1.2}
              />
              <line
                x1={PADDING_X}
                y1={PADDING_Y}
                x2={PADDING_X}
                y2={HEIGHT - PADDING_Y}
                stroke="rgba(148,163,184,0.6)"
                strokeWidth={1.2}
              />

              {[0, 0.5, 1].map((value) => (
                <text
                  key={`y-${value}`}
                  x={PADDING_X - 12}
                  y={HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#475569"
                >
                  {formatTick(value)}
                </text>
              ))}

              {xPositions.map((position, index) => (
                <text
                  key={`x-${points[index].bucket}`}
                  x={position}
                  y={HEIGHT - PADDING_Y + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#475569"
                >
                  {points[index].label}
                </text>
              ))}

              {buildPath()}

              {points.map((point, index) => {
                const value = normalizeValue(point, activeSeries.key, maxInterviews);
                const x = xPositions[index];
                const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
                return <circle key={`${activeSeries.key}-${point.bucket}`} cx={x} cy={y} r={3.5} fill={activeSeries.color} />;
              })}
            </svg>
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No interviewer metrics available.</div>
        )
      ) : null}
    </section>
  );
};
