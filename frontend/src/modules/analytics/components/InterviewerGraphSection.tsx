import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type {
  InterviewerPeriod,
  InterviewerSeniority,
  InterviewerStatsResponse
} from '../types/analytics';
import { buildInterviewerTimeline } from '../utils/interviewerTimeline';
import { InterviewerFilters } from './InterviewerFilters';

const PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: '1 month',
  rolling_3: 'Trailing 3 months',
  fytd: 'Financial year to date',
  rolling_12: 'Trailing 12 months'
};

const PERIOD_OPTIONS: InterviewerPeriod[] = ['last_month', 'rolling_3', 'fytd', 'rolling_12'];

interface InterviewerGraphSectionProps {
  period: InterviewerPeriod;
  onPeriodChange: (value: InterviewerPeriod) => void;
  selectedInterviewers: string[];
  manualInterviewers: string[];
  onManualInterviewersChange: (ids: string[]) => void;
  roleShortcuts: InterviewerSeniority[];
  onRoleShortcutsChange: (roles: InterviewerSeniority[]) => void;
  excludedInterviewers: string[];
  onExcludedInterviewersChange: (ids: string[]) => void;
  selectedRoles: InterviewerSeniority[];
  onRoleChange: (roles: InterviewerSeniority[]) => void;
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
}

const WIDTH = 960;
const HEIGHT = 360;
const PADDING_X = 72;
const PADDING_Y = 48;
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
  interviews: number;
  hireShare: number | null;
  caseScore: number | null;
  fitScore: number | null;
};

const formatBucketLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};

const normalizeValue = (point: ChartPoint, key: SeriesKey, maxCount: number) => {
  if (key === 'interviews') {
    return maxCount ? point.interviews / maxCount : null;
  }
  if (key === 'hireShare') {
    return point.hireShare;
  }
  if (key === 'caseScore') {
    return point.caseScore == null ? null : point.caseScore / MAX_SCORE;
  }
  if (key === 'fitScore') {
    return point.fitScore == null ? null : point.fitScore / MAX_SCORE;
  }
  return null;
};

export const InterviewerGraphSection = ({
  period,
  onPeriodChange,
  selectedInterviewers,
  manualInterviewers,
  onManualInterviewersChange,
  roleShortcuts,
  onRoleShortcutsChange,
  excludedInterviewers,
  onExcludedInterviewersChange,
  selectedRoles,
  onRoleChange,
  data,
  loading,
  error
}: InterviewerGraphSectionProps) => {
  const timeline = useMemo(() => buildInterviewerTimeline(data), [data]);
  const chartPoints = useMemo<ChartPoint[]>(() => {
    return timeline.map((point) => {
      const decisions = point.hire + point.reject;
      return {
        bucket: point.bucket,
        interviews: point.interviewCount,
        hireShare: decisions ? point.hire / decisions : null,
        caseScore: point.caseScoreCount ? point.caseScoreSum / point.caseScoreCount : null,
        fitScore: point.fitScoreCount ? point.fitScoreSum / point.fitScoreCount : null
      };
    });
  }, [timeline]);

  const [selectedSeries, setSelectedSeries] = useState<SeriesKey[]>(() => SERIES.map((item) => item.key));

  const maxInterviews = useMemo(() => {
    const valid = chartPoints.map((point) => point.interviews);
    return valid.length ? Math.max(...valid) : 0;
  }, [chartPoints]);

  const xPositions = useMemo(() => {
    if (chartPoints.length <= 1) {
      return chartPoints.map(() => WIDTH / 2);
    }
    const availableWidth = WIDTH - PADDING_X * 2;
    return chartPoints.map((_, index) => PADDING_X + (index / (chartPoints.length - 1)) * availableWidth);
  }, [chartPoints]);

  const toggleSeries = (key: SeriesKey) => {
    setSelectedSeries((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const buildPath = (key: SeriesKey, color: string) => {
    const values = chartPoints.map((point) => normalizeValue(point, key, maxInterviews));
    let path = '';
    let moveTo = true;
    values.forEach((value, index) => {
      if (value == null) {
        moveTo = true;
        return;
      }
      const x = xPositions[index];
      const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
      if (moveTo) {
        path += `M ${x} ${y}`;
        moveTo = false;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return <path key={key} d={path} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />;
  };

  const availableHeight = HEIGHT - PADDING_Y * 2;
  const xLabels = useMemo(() => {
    const step = chartPoints.length > 8 ? Math.ceil(chartPoints.length / 8) : 1;
    return chartPoints.map((point, index) => ({
      label: formatBucketLabel(point.bucket),
      index,
      visible: index % step === 0 || index === chartPoints.length - 1
    }));
  }, [chartPoints]);

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer performance graph</h2>
          <p className={styles.metricDetails}>Comparative view across interviewers for {PERIOD_LABELS[period]}</p>
        </div>
        <div className={styles.toggleGroup}>
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.toggleButton} ${period === option ? styles.toggleButtonActive : ''}`}
              onClick={() => onPeriodChange(option)}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>
      </header>

      <InterviewerFilters
        interviewers={data?.interviewers ?? []}
        selectedInterviewers={selectedInterviewers}
        manualInterviewers={manualInterviewers}
        onManualChange={onManualInterviewersChange}
        roleShortcuts={roleShortcuts}
        onRoleShortcutsChange={onRoleShortcutsChange}
        excludedInterviewers={excludedInterviewers}
        onExcludedChange={onExcludedInterviewersChange}
        selectedRoles={selectedRoles}
        onRoleChange={onRoleChange}
      />

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
        chartPoints.length ? (
          <div className={styles.timelineWrapper}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="Interviewer comparison chart">
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
                  x={PADDING_X - 16}
                  y={HEIGHT - PADDING_Y - value * availableHeight + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#475569"
                >
                  {Math.round(maxInterviews * value)}
                </text>
              ))}

              {[0, 0.5, 1].map((value) => (
                <text
                  key={`right-${value}`}
                  x={WIDTH - PADDING_X + 16}
                  y={HEIGHT - PADDING_Y - value * availableHeight + 4}
                  textAnchor="start"
                  fontSize={12}
                  fill="#475569"
                >
                  {Math.round(100 * value)}%
                </text>
              ))}

              {xLabels.map((item) => (
                <text
                  key={`x-${item.index}`}
                  x={xPositions[item.index]}
                  y={HEIGHT - PADDING_Y + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fill={item.visible ? '#475569' : 'rgba(71,85,105,0)'}
                >
                  {item.visible ? item.label : ''}
                </text>
              ))}

              {SERIES.filter((series) => selectedSeries.includes(series.key)).map((series) =>
                buildPath(series.key, series.color)
              )}

              {SERIES.filter((series) => selectedSeries.includes(series.key)).flatMap((series) =>
                chartPoints.map((point, index) => {
                  const value = normalizeValue(point, series.key, maxInterviews);
                  if (value == null) {
                    return null;
                  }
                  const x = xPositions[index];
                  const y = HEIGHT - PADDING_Y - value * (HEIGHT - PADDING_Y * 2);
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
