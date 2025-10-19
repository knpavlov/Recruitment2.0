import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { TimelineGrouping, TimelineResponse } from '../types/analytics';
import { TimelineChart, SeriesConfig } from './TimelineChart';

const TIMELINE_SERIES: SeriesConfig[] = [
  { key: 'resumes', label: 'Полученные резюме', color: '#0ea5e9', type: 'count' },
  { key: 'firstRoundInterviews', label: 'Первый раунд', color: '#22c55e', type: 'count' },
  { key: 'secondRoundInterviews', label: 'Второй раунд', color: '#65a30d', type: 'count' },
  { key: 'totalInterviews', label: 'Всего интервью', color: '#6366f1', type: 'count' },
  { key: 'offers', label: 'Офферы', color: '#f97316', type: 'count' },
  { key: 'rejects', label: 'Реджекты', color: '#ef4444', type: 'count' },
  { key: 'avgCaseScore', label: 'Средний балл кейс', color: '#a855f7', type: 'score' },
  { key: 'avgFitScore', label: 'Средний балл фит', color: '#ec4899', type: 'score' },
  { key: 'femaleShare', label: 'Доля женщин', color: '#facc15', type: 'percentage' }
];

interface TimelineSectionProps {
  grouping: TimelineGrouping;
  onGroupingChange: (value: TimelineGrouping) => void;
  from?: string;
  to?: string;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
  data: TimelineResponse | null;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

const GROUPING_LABELS: Record<TimelineGrouping, string> = {
  week: 'Недельный',
  month: 'Помесячный',
  quarter: 'Поквартальный'
};

const formatPercent = (value: number | null) => {
  if (value == null) {
    return '—';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const formatScore = (value: number | null) => {
  if (value == null) {
    return '—';
  }
  return value.toFixed(1);
};

export const TimelineSection = ({
  grouping,
  onGroupingChange,
  from,
  to,
  onFromChange,
  onToChange,
  data,
  loading,
  error,
  onDownload
}: TimelineSectionProps) => {
  const [selectedSeries, setSelectedSeries] = useState<SeriesConfig['key'][]>(() => [
    'resumes',
    'totalInterviews',
    'offers',
    'rejects',
    'femaleShare'
  ]);

  const activeSeries = useMemo(
    () => TIMELINE_SERIES.filter((item) => selectedSeries.includes(item.key)),
    [selectedSeries]
  );

  const toggleSeries = (key: SeriesConfig['key']) => {
    setSelectedSeries((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const defaultFrom = data ? data.range.start.slice(0, 10) : '';
  const defaultTo = data ? data.range.end.slice(0, 10) : '';

  const points = data?.points ?? [];

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Динамика показателей</h2>
          <p className={styles.metricDetails}>Анализ конверсии и активности по выбранному шагу агрегации</p>
        </div>
        <div className={styles.sectionActions}>
          <button type="button" className={styles.secondaryButton} onClick={onDownload}>
            Экспортировать CSV
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="timeline-grouping">
            Период агрегации
          </label>
          <select
            id="timeline-grouping"
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
          <label className={styles.inputLabel} htmlFor="timeline-from">
            Начало периода
          </label>
          <input
            id="timeline-from"
            type="date"
            className={styles.dateInput}
            value={from ?? defaultFrom}
            onChange={(event) => onFromChange(event.target.value || undefined)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="timeline-to">
            Конец периода
          </label>
          <input
            id="timeline-to"
            type="date"
            className={styles.dateInput}
            value={to ?? defaultTo}
            onChange={(event) => onToChange(event.target.value || undefined)}
          />
        </div>
      </div>

      <div className={styles.checkboxGroup}>
        {TIMELINE_SERIES.map((item) => {
          const isActive = selectedSeries.includes(item.key);
          return (
            <label
              key={item.key}
              className={`${styles.checkboxOption} ${isActive ? styles.checkboxOptionActive : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggleSeries(item.key)}
              />
              <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
            </label>
          );
        })}
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Строим график…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <>
            <TimelineChart points={points} series={activeSeries} />
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Период</th>
                    <th>Резюме</th>
                    <th>1 раунд</th>
                    <th>2 раунд</th>
                    <th>Интервью</th>
                    <th>Офферы</th>
                    <th>Реджекты</th>
                    <th>Балл кейс</th>
                    <th>Балл фит</th>
                    <th>Доля женщин</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => {
                    const label = new Date(point.bucket);
                    const formatted = Number.isNaN(label.getTime())
                      ? point.bucket
                      : new Intl.DateTimeFormat('ru', { year: 'numeric', month: 'long' }).format(label);
                    return (
                      <tr key={point.bucket}>
                        <td>{formatted}</td>
                        <td>{point.resumes}</td>
                        <td>{point.firstRoundInterviews}</td>
                        <td>{point.secondRoundInterviews}</td>
                        <td>{point.totalInterviews}</td>
                        <td>{point.offers}</td>
                        <td>{point.rejects}</td>
                        <td>{formatScore(point.avgCaseScore)}</td>
                        <td>{formatScore(point.avgFitScore)}</td>
                        <td>{formatPercent(point.femaleShare)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={styles.timelineEmpty}>Нет данных для выбранных параметров.</div>
        )
      ) : null}
    </section>
  );
};
