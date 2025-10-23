import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { TimelineGrouping, TimelineResponse } from '../types/analytics';
import { TimelineChart, SeriesConfig } from './TimelineChart';

const TIMELINE_SERIES: SeriesConfig[] = [
  { key: 'resumes', label: 'Resumes received', color: '#0ea5e9', type: 'count' },
  { key: 'firstRoundInterviews', label: 'First round interviews', color: '#22c55e', type: 'count' },
  { key: 'secondRoundInterviews', label: 'Second round interviews', color: '#65a30d', type: 'count' },
  { key: 'totalInterviews', label: 'Total interviews', color: '#6366f1', type: 'count' },
  { key: 'offers', label: 'Offers', color: '#f97316', type: 'count' },
  { key: 'rejects', label: 'Rejects', color: '#ef4444', type: 'count' },
  { key: 'avgCaseScore', label: 'Average case score', color: '#a855f7', type: 'score' },
  { key: 'avgFitScore', label: 'Average fit score', color: '#ec4899', type: 'score' },
  { key: 'femaleShare', label: 'Female share', color: '#facc15', type: 'percentage' }
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
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly'
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
          <h2 className={styles.sectionTitle}>Performance over time</h2>
          <p className={styles.metricDetails}>Conversion and activity across the selected aggregation step</p>
        </div>
        <div className={styles.sectionActions}>
          <button type="button" className={styles.secondaryButton} onClick={onDownload}>
            Export CSV
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="timeline-grouping">
            Aggregation period
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
            Start date
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
            End date
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
      {loading ? <div className={styles.loadingLabel}>Preparing chart…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <TimelineChart points={points} series={activeSeries} />
        ) : (
          <div className={styles.timelineEmpty}>No data for the selected parameters.</div>
        )
      ) : null}
    </section>
  );
};
