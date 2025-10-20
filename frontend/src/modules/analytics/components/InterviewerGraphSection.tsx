import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';
import { buildInterviewerTotals } from '../utils/interviewerTotals';

const PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  rolling_3: 'Trailing 3 months',
  fytd: 'Financial year to date',
  rolling_12: 'Trailing 12 months'
};

interface InterviewerGraphSectionProps {
  period: InterviewerPeriod;
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
  id: string;
  name: string;
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

export const InterviewerGraphSection = ({ period, data, loading, error }: InterviewerGraphSectionProps) => {
  const totals = useMemo(() => buildInterviewerTotals(data), [data]);
  const points = useMemo<ChartPoint[]>(() => {
    return totals.map((item) => {
      const decisions = item.hire + item.reject;
      return {
        id: item.id,
        name: item.name,
        interviews: item.interviewCount,
        hireShare: decisions ? item.hire / decisions : 0,
        caseScore: item.caseScoreCount ? item.caseScoreSum / item.caseScoreCount : 0,
        fitScore: item.fitScoreCount ? item.fitScoreSum / item.fitScoreCount : 0
      };
    });
  }, [totals]);

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
    return <path key={key} d={path} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />;
  };

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer performance graph</h2>
          <p className={styles.metricDetails}>Comparative view across interviewers for {PERIOD_LABELS[period]}</p>
        </div>
      </header>

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
                  {Math.round(maxInterviews * value)}
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
                  key={`x-${points[index].id}`}
                  x={position}
                  y={HEIGHT - PADDING_Y + 20}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#475569"
                >
                  {points[index].name}
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
                  return <circle key={`${series.key}-${point.id}`} cx={x} cy={y} r={3.5} fill={series.color} />;
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
