import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';
import type { InterviewerSeniority } from '../../../shared/types/account';
import { InterviewerFilters } from './InterviewerFilters';

const GROUPING_LABELS: Record<TimelineGrouping, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly'
};

interface InterviewerGraphSectionProps {
  grouping: TimelineGrouping;
  onGroupingChange: (value: TimelineGrouping) => void;
  from?: string;
  to?: string;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
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

const RANGE_LABEL_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const formatRangeDescription = (
  start: string | undefined,
  end: string | undefined,
  groupingLabel: string
) => {
  // Формируем читабельную подпись в зависимости от выбранного диапазона
  const safeStart = start ? new Date(start) : null;
  const safeEnd = end ? new Date(end) : null;

  const hasValidStart = safeStart && !Number.isNaN(safeStart.getTime());
  const hasValidEnd = safeEnd && !Number.isNaN(safeEnd.getTime());

  if (hasValidStart && hasValidEnd) {
    return `${groupingLabel} averages from ${RANGE_LABEL_FORMATTER.format(safeStart!)} to ${RANGE_LABEL_FORMATTER.format(safeEnd!)}`;
  }

  if (hasValidStart) {
    return `${groupingLabel} averages since ${RANGE_LABEL_FORMATTER.format(safeStart!)}`;
  }

  if (hasValidEnd) {
    return `${groupingLabel} averages until ${RANGE_LABEL_FORMATTER.format(safeEnd!)}`;
  }

  return `${groupingLabel} averages for the available data range`;
};

export const InterviewerGraphSection = ({
  grouping,
  onGroupingChange,
  from,
  to,
  onFromChange,
  onToChange,
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

    const buckets = new Map<
      string,
      Map<
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
      >
    >();

    data.buckets.forEach((bucket) => {
      const bucketMap = buckets.get(bucket.bucket) ?? new Map();
      const current =
        bucketMap.get(bucket.interviewerId) ?? {
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
      if (bucket.avgCaseScore != null) {
        current.caseSum += bucket.avgCaseScore * bucket.caseScoreCount;
        current.caseCount += bucket.caseScoreCount;
      }
      if (bucket.avgFitScore != null) {
        current.fitSum += bucket.avgFitScore * bucket.fitScoreCount;
        current.fitCount += bucket.fitScoreCount;
      }

      bucketMap.set(bucket.interviewerId, current);
      buckets.set(bucket.bucket, bucketMap);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([bucketKey, interviewerMap]) => {
        const interviewerEntries = Array.from(interviewerMap.values());
        const interviewerCount = interviewerEntries.length;

        let interviewSum = 0;
        let hireShareSum = 0;
        let hireShareCount = 0;
        let caseScoreSum = 0;
        let caseScoreCount = 0;
        let fitScoreSum = 0;
        let fitScoreCount = 0;

        interviewerEntries.forEach((entry) => {
          interviewSum += entry.interviews;
          const decisionTotal = entry.hire + entry.reject;
          if (decisionTotal > 0) {
            hireShareSum += entry.hire / decisionTotal;
            hireShareCount += 1;
          }
          if (entry.caseCount > 0) {
            caseScoreSum += entry.caseSum / entry.caseCount;
            caseScoreCount += 1;
          }
          if (entry.fitCount > 0) {
            fitScoreSum += entry.fitSum / entry.fitCount;
            fitScoreCount += 1;
          }
        });

        const averageInterviews = interviewerCount ? interviewSum / interviewerCount : 0;
        const averageHireShare = hireShareCount ? hireShareSum / hireShareCount : 0;
        const averageCaseScore = caseScoreCount ? caseScoreSum / caseScoreCount : 0;
        const averageFitScore = fitScoreCount ? fitScoreSum / fitScoreCount : 0;

        return {
          bucket: bucketKey,
          label: formatBucketLabel(bucketKey, data.groupBy),
          interviews: averageInterviews,
          hireShare: averageHireShare,
          caseScore: averageCaseScore,
          fitScore: averageFitScore
        };
      });
  }, [data]);

  const [selectedSeries, setSelectedSeries] = useState<SeriesKey[]>(() => SERIES.map((item) => item.key));

  const maxInterviews = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    return Math.max(...points.map((point) => point.interviews));
  }, [points]);

  const xPositions = useMemo(() => {
    if (points.length <= 1) {
      return points.map(() => WIDTH / 2);
    }
    const availableWidth = WIDTH - PADDING_X * 2;
    return points.map((_, index) => PADDING_X + (index / (points.length - 1)) * availableWidth);
  }, [points]);

  const toggleSeries = (key: SeriesKey) => {
    setSelectedSeries((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const buildPath = (key: SeriesKey, color: string) => {
    const values = points.map((point) => normalizeValue(point, key, maxInterviews));
    let path = '';
    let moveTo = true;
    values.forEach((value, index) => {
      const x = xPositions[index];
      const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
      if (!Number.isFinite(y)) {
        return;
      }
      if (moveTo) {
        path += `M ${x} ${y}`;
        moveTo = false;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return <path key={key} d={path} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />;
  };

  const defaultFrom = data ? data.range.start.slice(0, 10) : '';
  const defaultTo = data ? data.range.end.slice(0, 10) : '';
  const fromValue = from ?? defaultFrom;
  const toValue = to ?? defaultTo;
  const groupingLabel = GROUPING_LABELS[data?.groupBy ?? grouping];
  const rangeDescription = formatRangeDescription(
    fromValue || undefined,
    toValue || undefined,
    groupingLabel
  );

  const formatLeftAxis = (value: number) => {
    const raw = maxInterviews * value;
    if (!Number.isFinite(raw) || raw === 0) {
      return '0';
    }
    if (raw >= 10) {
      return Math.round(raw).toString();
    }
    return raw.toFixed(1);
  };

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer performance graph</h2>
          <p className={styles.metricDetails}>{rangeDescription}</p>
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
          <label className={styles.inputLabel} htmlFor="interviewer-grouping">
            Aggregation period
          </label>
          <select
            id="interviewer-grouping"
            className={styles.select}
            value={grouping}
            onChange={(event) => onGroupingChange(event.target.value as TimelineGrouping)}
          >
            {Object.entries(GROUPING_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-from">
            Start date
          </label>
          <input
            id="interviewer-from"
            type="date"
            className={styles.dateInput}
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value || undefined)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-to">
            End date
          </label>
          <input
            id="interviewer-to"
            type="date"
            className={styles.dateInput}
            value={toValue}
            onChange={(event) => onToChange(event.target.value || undefined)}
          />
        </div>
      </div>

      <div className={styles.checkboxGroup}>
        {SERIES.map((series) => {
          const isActive = selectedSeries.includes(series.key);
          return (
            <label
              key={series.key}
              className={`${styles.checkboxOption} ${isActive ? styles.checkboxOptionActive : ''}`}
            >
              <input type="checkbox" checked={isActive} onChange={() => toggleSeries(series.key)} />
              <span style={{ color: series.color, fontWeight: 600 }}>{series.label}</span>
            </label>
          );
        })}
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
                  key={`left-${value}`}
                  x={PADDING_X - 12}
                  y={HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#475569"
                >
                  {formatLeftAxis(value)}
                </text>
              ))}

              {[0, 0.5, 1].map((value) => (
                <text
                  key={`right-${value}`}
                  x={WIDTH - PADDING_X + 12}
                  y={HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2) + 4}
                  textAnchor="start"
                  fontSize={12}
                  fill="#475569"
                >
                  {Math.round(100 * value)}%
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

              {SERIES.filter((series) => selectedSeries.includes(series.key)).map((series) =>
                buildPath(series.key, series.color)
              )}

              {SERIES.filter((series) => selectedSeries.includes(series.key)).flatMap((series) =>
                points.map((point, index) => {
                  const value = normalizeValue(point, series.key, maxInterviews);
                  const x = xPositions[index];
                  const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
                  if (!Number.isFinite(y)) {
                    return null;
                  }
                  return <circle key={`${series.key}-${point.bucket}`} cx={x} cy={y} r={3.5} fill={series.color} />;
                })
              )}
            </svg>
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No interviewer metrics available.</div>
        )
      ) : null}
    </section>
  );
};
