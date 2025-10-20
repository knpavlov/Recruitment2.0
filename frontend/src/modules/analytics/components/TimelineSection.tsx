import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { TimelineGrouping, TimelinePoint, TimelineResponse } from '../types/analytics';
import { TimelineChart, SeriesConfig } from './TimelineChart';

const TIMELINE_SERIES: SeriesConfig<TimelinePoint>[] = [
  { key: 'resumes', label: 'Resumes received', color: '#0ea5e9', type: 'count' },
  { key: 'firstRoundInterviews', label: 'First round interviews', color: '#22c55e', type: 'count' },
  { key: 'secondRoundInterviews', label: 'Second round interviews', color: '#65a30d', type: 'count' },
  { key: 'totalInterviews', label: 'Total interviews', color: '#6366f1', type: 'count' },
  { key: 'offers', label: 'Offers extended', color: '#f97316', type: 'count' },
  { key: 'rejects', label: 'Rejections', color: '#ef4444', type: 'count' },
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

const formatPercent = (value: number | null) => {
  if (value == null) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const formatScore = (value: number | null) => {
  if (value == null) {
    return 'n/a';
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
  const [selectedSeries, setSelectedSeries] = useState<Array<SeriesConfig<TimelinePoint>['key']>>(() => [
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

  const toggleSeries = (key: SeriesConfig<TimelinePoint>['key']) => {
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
          <h2 className={styles.sectionTitle}>Pipeline dynamics</h2>
          <p className={styles.metricDetails}>
            Conversion and activity breakdown by aggregation step
          </p>
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
            Range start
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
            Range end
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
      {loading ? <div className={styles.loadingLabel}>Loading timeline…</div> : null}

      {!loading && !error ? (
        points.length ? (
          <>
            <TimelineChart points={points} series={activeSeries} ariaLabel="Timeline of key hiring metrics" />
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Resumes</th>
                    <th>1st round</th>
                    <th>2nd round</th>
                    <th>Interviews</th>
                    <th>Offers</th>
                    <th>Rejects</th>
                    <th>Case score</th>
                    <th>Fit score</th>
                    <th>Female share</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => {
                    const label = new Date(point.bucket);
                    const formatted = Number.isNaN(label.getTime())
                      ? point.bucket
                      : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long' }).format(label);
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
          <div className={styles.timelineEmpty}>No data for the selected parameters.</div>
        )
      ) : null}
    </section>
  );
};
