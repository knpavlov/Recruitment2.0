import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { PipelineTimeline, TimeGranularity } from '../types';

const CHART_WIDTH = 960;
const CHART_HEIGHT = 320;
const CHART_PADDING = { top: 32, right: 72, bottom: 60, left: 72 };

const GRANULARITY_LABELS: Record<TimeGranularity, string> = {
  week: 'Недельный',
  month: 'Месячный',
  quarter: 'Квартальный'
};

interface MetricDefinition {
  key: keyof PipelineTimeline['points'][number];
  label: string;
  category: 'count' | 'percentage';
  color: string;
  transform?: (value: number | null) => number | null;
  formatValue: (value: number | null) => string;
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: 'resumes', label: 'Резюме', category: 'count', color: '#0ea5e9', formatValue: (value) => (value ?? 0).toString() },
  {
    key: 'firstRoundInterviews',
    label: 'Интервью 1 раунда',
    category: 'count',
    color: '#6366f1',
    formatValue: (value) => (value ?? 0).toString()
  },
  {
    key: 'secondRoundInterviews',
    label: 'Интервью 2 раунда',
    category: 'count',
    color: '#ec4899',
    formatValue: (value) => (value ?? 0).toString()
  },
  {
    key: 'totalInterviews',
    label: 'Всего интервью',
    category: 'count',
    color: '#0f172a',
    formatValue: (value) => (value ?? 0).toString()
  },
  { key: 'rejects', label: 'Реджекты', category: 'count', color: '#f97316', formatValue: (value) => (value ?? 0).toString() },
  { key: 'offers', label: 'Офферы', category: 'count', color: '#22c55e', formatValue: (value) => (value ?? 0).toString() },
  {
    key: 'avgCaseScore',
    label: 'Средний балл кейс',
    category: 'percentage',
    color: '#14b8a6',
    transform: (value) => (value === null ? null : (value / 5) * 100),
    formatValue: (value) => (value === null ? '—' : value.toFixed(1))
  },
  {
    key: 'avgFitScore',
    label: 'Средний балл фит',
    category: 'percentage',
    color: '#facc15',
    transform: (value) => (value === null ? null : (value / 5) * 100),
    formatValue: (value) => (value === null ? '—' : value.toFixed(1))
  },
  {
    key: 'femaleShare',
    label: 'Доля женщин',
    category: 'percentage',
    color: '#ef4444',
    formatValue: (value) => (value === null ? '—' : `${value.toFixed(1)}%`)
  }
];

const DEFAULT_SELECTED: MetricDefinition['key'][] = ['resumes', 'totalInterviews', 'offers'];

interface PipelineChartProps {
  timelines: Record<TimeGranularity, PipelineTimeline>;
  activeGranularity: TimeGranularity;
  onGranularityChange: (granularity: TimeGranularity) => void;
  onExport: () => void;
}

export const PipelineChart = ({ timelines, activeGranularity, onGranularityChange, onExport }: PipelineChartProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricDefinition['key'][]>(DEFAULT_SELECTED);

  const timeline = timelines[activeGranularity];

  const metricDefinitions = useMemo(() => METRIC_DEFINITIONS, []);

  const toggleMetric = (key: MetricDefinition['key']) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  const chartData = useMemo(() => {
    const countMetrics = metricDefinitions.filter((metric) => metric.category === 'count' && selectedMetrics.includes(metric.key));
    const percentMetrics = metricDefinitions.filter(
      (metric) => metric.category === 'percentage' && selectedMetrics.includes(metric.key)
    );
    const countMax = Math.max(
      1,
      ...timeline.points.map((point) =>
        countMetrics.reduce((max, metric) => {
          const raw = point[metric.key];
          if (typeof raw === 'number') {
            return Math.max(max, raw);
          }
          return max;
        }, 0)
      )
    );
    const percentMax = 100;

    const xStep = timeline.points.length > 1
      ? (CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right) / (timeline.points.length - 1)
      : 0;

    const buildPath = (metric: MetricDefinition) => {
      const values = timeline.points.map((point, index) => {
        const raw = point[metric.key];
        const normalized =
          metric.category === 'percentage'
            ? metric.transform
              ? metric.transform(raw as number | null)
              : (raw as number | null)
            : (raw as number | null);
        if (normalized === null || normalized === undefined) {
          return null;
        }
        const x = CHART_PADDING.left + index * xStep;
        const yBase = CHART_HEIGHT - CHART_PADDING.bottom;
        const usableHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
        const scaleMax = metric.category === 'count' ? countMax : percentMax;
        const ratio = scaleMax > 0 ? Math.min(normalized / scaleMax, 1) : 0;
        const y = yBase - ratio * usableHeight;
        return `${x},${y}`;
      });
      const filtered = values.filter((value): value is string => Boolean(value));
      return filtered.join(' ');
    };

    const countPaths = countMetrics.map((metric) => ({ metric, path: buildPath(metric) }));
    const percentPaths = percentMetrics.map((metric) => ({ metric, path: buildPath(metric) }));

    return { countMax, percentMax, countPaths, percentPaths, xStep };
  }, [metricDefinitions, selectedMetrics, timeline.points]);

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Воронка подбора</h2>
          <p className={styles.headerSubtitle}>Динамика резюме, интервью и решений по выбранному периоду</p>
        </div>
        <button type="button" className={styles.exportButton} onClick={onExport}>
          Экспорт временного ряда
        </button>
      </div>
      <div className={styles.controlsRow}>
        <div className={styles.periodSelector}>
          {(Object.keys(GRANULARITY_LABELS) as TimeGranularity[]).map((granularity) => (
            <button
              key={granularity}
              type="button"
              className={`${styles.periodButton} ${granularity === activeGranularity ? styles.periodButtonActive : ''}`}
              onClick={() => onGranularityChange(granularity)}
            >
              {GRANULARITY_LABELS[granularity]}
            </button>
          ))}
        </div>
        <div className={styles.metricsSelector}>
          {metricDefinitions.map((metric) => (
            <button
              key={metric.key}
              type="button"
              className={`${styles.metricsSelectorButton} ${
                selectedMetrics.includes(metric.key) ? styles.metricsSelectorButtonActive : ''
              }`}
              onClick={() => toggleMetric(metric.key)}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <svg
          className={styles.chartCanvas}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1={CHART_PADDING.left}
            y1={CHART_HEIGHT - CHART_PADDING.bottom}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#cbd5f5"
            strokeWidth={1}
          />
          <line
            x1={CHART_PADDING.left}
            y1={CHART_PADDING.top}
            x2={CHART_PADDING.left}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#cbd5f5"
            strokeWidth={1}
          />
          <line
            x1={CHART_WIDTH - CHART_PADDING.right}
            y1={CHART_PADDING.top}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#cbd5f5"
            strokeWidth={1}
          />

          {chartData.countPaths.map(({ metric, path }) => (
            <polyline key={metric.key} fill="none" stroke={metric.color} strokeWidth={3} points={path} strokeLinejoin="round" />
          ))}
          {chartData.percentPaths.map(({ metric, path }) => (
            <polyline
              key={metric.key}
              fill="none"
              stroke={metric.color}
              strokeWidth={3}
              strokeDasharray="6 6"
              points={path}
              strokeLinejoin="round"
            />
          ))}

          {timeline.points.map((point, index) => {
            const x = CHART_PADDING.left + index * chartData.xStep;
            const y = CHART_HEIGHT - CHART_PADDING.bottom + 20;
            return (
              <g key={point.start} transform={`translate(${x}, ${y})`}>
                <text textAnchor="middle" fontSize="12" fill="#475569" transform="rotate(0)">
                  {point.label}
                </text>
              </g>
            );
          })}

          {Array.from({ length: 5 }).map((_, index) => {
            const value = Math.round((chartData.countMax / 4) * index);
            const y =
              CHART_HEIGHT -
              CHART_PADDING.bottom -
              ((chartData.countMax > 0 ? value / chartData.countMax : 0) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom));
            return (
              <text key={`count-tick-${index}`} x={CHART_PADDING.left - 12} y={y + 4} fontSize="11" fill="#475569" textAnchor="end">
                {value}
              </text>
            );
          })}

          {[0, 25, 50, 75, 100].map((value) => {
            const y =
              CHART_HEIGHT -
              CHART_PADDING.bottom -
              (value / chartData.percentMax) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
            return (
              <text
                key={`pct-tick-${value}`}
                x={CHART_WIDTH - CHART_PADDING.right + 12}
                y={y + 4}
                fontSize="11"
                fill="#475569"
                textAnchor="start"
              >
                {`${value}%`}
              </text>
            );
          })}
        </svg>
      </div>
      <div className={styles.legend}>
        {metricDefinitions
          .filter((metric) => selectedMetrics.includes(metric.key))
          .map((metric) => (
            <span key={metric.key} className={styles.legendItem}>
              <span className={styles.legendMarker} style={{ background: metric.color }} />
              {metric.label}
            </span>
          ))}
      </div>
    </section>
  );
};
