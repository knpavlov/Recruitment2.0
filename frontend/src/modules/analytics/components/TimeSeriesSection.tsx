import { useMemo, useState, ChangeEvent } from 'react';
import {
  AnalyticsTimeGranularity,
  AnalyticsTimeSeriesResponse
} from '../../../shared/types/analytics';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { formatDate } from '../../../shared/utils/date';
import { formatInteger, formatPercentage, formatScore } from '../utils/format';
import { ExportButton } from './ExportButton';
import { SimpleLineChart } from './SimpleLineChart';

interface TimeSeriesSectionProps {
  granularity: AnalyticsTimeGranularity;
  rangePreset: string;
  onChangeGranularity: (granularity: AnalyticsTimeGranularity) => void;
  onChangeRangePreset: (preset: string) => void;
  data: AnalyticsTimeSeriesResponse | null;
  isLoading: boolean;
  error: string | null;
  onExport: () => Promise<void>;
}

interface MetricDefinition {
  key: string;
  label: string;
  color: string;
  axis: 'left' | 'right';
  selector: (point: AnalyticsTimeSeriesResponse['points'][number]) => number | null;
  formatter: (value: number) => string;
}

const METRICS: MetricDefinition[] = [
  {
    key: 'resumes',
    label: 'Резюме',
    color: '#6366f1',
    axis: 'left',
    selector: (point) => point.resumesReceived,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'firstRound',
    label: '1-й раунд',
    color: '#22d3ee',
    axis: 'left',
    selector: (point) => point.firstRoundInterviews,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'secondRound',
    label: '2-й раунд',
    color: '#14b8a6',
    axis: 'left',
    selector: (point) => point.secondRoundInterviews,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'totalInterviews',
    label: 'Всего интервью',
    color: '#0ea5e9',
    axis: 'left',
    selector: (point) => point.totalInterviews,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'rejections',
    label: 'Отказы',
    color: '#f97316',
    axis: 'left',
    selector: (point) => point.rejections,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'offers',
    label: 'Офферы',
    color: '#a855f7',
    axis: 'left',
    selector: (point) => point.offers,
    formatter: (value) => formatInteger(value)
  },
  {
    key: 'averageCaseScore',
    label: 'Средний балл (кейс)',
    color: '#ef4444',
    axis: 'right',
    selector: (point) => point.averageCaseScore,
    formatter: (value) => formatScore(value, 2)
  },
  {
    key: 'averageFitScore',
    label: 'Средний балл (фит)',
    color: '#10b981',
    axis: 'right',
    selector: (point) => point.averageFitScore,
    formatter: (value) => formatScore(value, 2)
  },
  {
    key: 'femaleShare',
    label: 'Доля женщин',
    color: '#facc15',
    axis: 'right',
    selector: (point) => (point.femaleShare != null ? point.femaleShare * 100 : null),
    formatter: (value) => formatPercentage(value / 100)
  }
];

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '6m', label: 'Последние 6 месяцев' },
  { value: '12m', label: 'Последние 12 месяцев' },
  { value: '24m', label: 'Последние 24 месяца' }
];

export const TimeSeriesSection = ({
  granularity,
  rangePreset,
  onChangeGranularity,
  onChangeRangePreset,
  data,
  isLoading,
  error,
  onExport
}: TimeSeriesSectionProps) => {
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>([
    'resumes',
    'totalInterviews',
    'offers',
    'femaleShare'
  ]);

  const handleGranularityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangeGranularity(event.target.value as AnalyticsTimeGranularity);
  };

  const handleRangeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangeRangePreset(event.target.value);
  };

  const toggleMetric = (key: string) => {
    setVisibleMetrics((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  };

  const chartPoints = useMemo(() => {
    if (!data) {
      return [] as { label: string; values: Record<string, number | null> }[];
    }
    return data.points.map((point) => {
      const values: Record<string, number | null> = {};
      METRICS.forEach((metric) => {
        values[metric.key] = metric.selector(point);
      });
      const label = `${formatDate(point.periodStart)} — ${formatDate(point.periodEnd)}`;
      return { label, values };
    });
  }, [data]);

  const metricDefinitions = useMemo(
    () => METRICS.filter((metric) => visibleMetrics.includes(metric.key) && chartPoints.length > 0),
    [visibleMetrics, chartPoints]
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Воронка найма</h2>
          <p className={styles.subtitle}>Объемы резюме, интервью и решений по кандидатам.</p>
        </div>
        <div className={styles.controls}>
          <label>
            Гранулярность
            <select value={granularity} onChange={handleGranularityChange}>
              <option value="week">Неделями</option>
              <option value="month">Месяцами</option>
              <option value="quarter">Кварталами</option>
            </select>
          </label>
          <label>
            Период
            <select value={rangePreset} onChange={handleRangeChange}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ExportButton label="Экспорт" onExport={onExport} />
        </div>
      </div>
      {isLoading && <p className={styles.loading}>Загрузка временного ряда…</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      {chartPoints.length > 0 && !isLoading && !error && (
        <>
          <div className={styles.metricToggles}>
            {METRICS.map((metric) => (
              <label key={metric.key} className={styles.metricToggle}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.includes(metric.key)}
                  onChange={() => toggleMetric(metric.key)}
                />
                <span>{metric.label}</span>
              </label>
            ))}
          </div>
          <div className={styles.chartContainer}>
            <SimpleLineChart
              points={chartPoints}
              series={metricDefinitions.map((metric) => ({
                key: metric.key,
                label: metric.label,
                color: metric.color,
                formatter: metric.formatter
              }))}
            />
          </div>
        </>
      )}
      {!isLoading && !error && chartPoints.length === 0 && (
        <p className={styles.loading}>Недостаточно данных для построения графика.</p>
      )}
    </section>
  );
};
