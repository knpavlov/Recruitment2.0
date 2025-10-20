import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';

interface InterviewerSectionProps {
  period: InterviewerPeriod;
  onPeriodChange: (value: InterviewerPeriod) => void;
  range: { from: string; to: string };
  selectedInterviewers: string[];
  onInterviewerChange: (ids: string[]) => void;
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

const PERIOD_OPTIONS: InterviewerPeriod[] = ['last_month', 'last_3_months', 'fytd', 'rolling_12'];

const PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  fytd: 'Fiscal year to date',
  rolling_12: 'Rolling 12 months'
};

const formatScoreValue = (sum: number, count: number) => {
  if (!count) {
    return null;
  }
  return sum / count;
};

const formatShareValue = (numerator: number, denominator: number) => {
  if (!denominator) {
    return null;
  }
  return numerator / denominator;
};

const formatPercentLabel = (value: number | null) => {
  if (value == null) {
    return 'n/a';
  }
  return `${Math.round(value * 100)}%`;
};

const InterviewerFilterDropdown = ({
  options,
  selected,
  onChange,
  disabled
}: {
  options: InterviewerStatsResponse['interviewers'];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(
    () => new Set(selected.map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0)),
    [selected]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const toggleOption = (id: string) => {
    const normalized = id.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    if (selectedSet.has(normalized)) {
      onChange(selected.filter((value) => value.trim().toLowerCase() !== normalized));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((option) => option.id));
  };

  const handleClear = () => {
    onChange([]);
  };

  const label = selected.length
    ? `${selected.length} selected`
    : options.length
    ? 'All interviewers'
    : 'No interviewers';

  return (
    <div className={styles.dropdown} ref={containerRef}>
      <button
        type="button"
        className={styles.dropdownButton}
        onClick={() => setOpen((state) => !state)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
      </button>
      {open ? (
        <div className={styles.dropdownMenu} role="listbox">
          <div className={styles.dropdownActions}>
            <button type="button" className={styles.dropdownActionButton} onClick={handleSelectAll}>
              Select all
            </button>
            <button type="button" className={styles.dropdownActionButton} onClick={handleClear}>
              Clear
            </button>
          </div>
          <div className={styles.dropdownOptions}>
            {options.map((option) => {
              const isChecked = selectedSet.has(option.id.trim().toLowerCase());
              return (
                <label key={option.id} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(option.id)}
                  />
                  <span>{option.name}</span>
                  {option.email ? <span className={styles.badge}>{option.email}</span> : null}
                </label>
              );
            })}
            {!options.length ? <div className={styles.dropdownEmpty}>No interviewers found.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const InterviewerSection = ({
  period,
  onPeriodChange,
  range,
  selectedInterviewers,
  onInterviewerChange,
  data,
  loading,
  error,
  onDownload
}: InterviewerSectionProps) => {
  const totals = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        name: string;
        email: string;
        interviewCount: number;
        hire: number;
        reject: number;
        caseScoreSum: number;
        caseScoreCount: number;
        fitScoreSum: number;
        fitScoreCount: number;
        caseAverage: number | null;
        fitAverage: number | null;
        hireShare: number | null;
        rejectShare: number | null;
      }>;
    }

    const map = new Map<string, {
      id: string;
      name: string;
      email: string;
      interviewCount: number;
      hire: number;
      reject: number;
      caseScoreSum: number;
      caseScoreCount: number;
      fitScoreSum: number;
      fitScoreCount: number;
    }>();

    data.buckets.forEach((bucket) => {
      const existing = map.get(bucket.interviewerId) ?? {
        id: bucket.interviewerId,
        name: bucket.interviewerName,
        email: bucket.interviewerEmail,
        interviewCount: 0,
        hire: 0,
        reject: 0,
        caseScoreSum: 0,
        caseScoreCount: 0,
        fitScoreSum: 0,
        fitScoreCount: 0
      };

      existing.interviewCount += bucket.interviewCount;
      existing.hire += bucket.hireRecommendations;
      existing.reject += bucket.rejectRecommendations;
      if (bucket.avgCaseScore != null) {
        existing.caseScoreSum += bucket.avgCaseScore * bucket.caseScoreCount;
        existing.caseScoreCount += bucket.caseScoreCount;
      }
      if (bucket.avgFitScore != null) {
        existing.fitScoreSum += bucket.avgFitScore * bucket.fitScoreCount;
        existing.fitScoreCount += bucket.fitScoreCount;
      }

      map.set(bucket.interviewerId, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.interviewCount - a.interviewCount)
      .map((item) => {
        const decisionTotal = item.hire + item.reject;
        const caseAverage = formatScoreValue(item.caseScoreSum, item.caseScoreCount);
        const fitAverage = formatScoreValue(item.fitScoreSum, item.fitScoreCount);
        const hireShare = formatShareValue(item.hire, decisionTotal);
        const rejectShare = formatShareValue(item.reject, decisionTotal);
        return {
          ...item,
          caseAverage,
          fitAverage,
          hireShare,
          rejectShare
        };
      });
  }, [data]);

  const maxInterviews = totals.length ? Math.max(...totals.map((item) => item.interviewCount)) : 0;

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer statistics</h2>
          <p className={styles.metricDetails}>
            {PERIOD_LABELS[period]} · {range.from} → {range.to}
          </p>
        </div>
        <div className={styles.sectionActions}>
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
          <button type="button" className={styles.secondaryButton} onClick={onDownload}>
            Export CSV
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Filter interviewers</label>
          <InterviewerFilterDropdown
            options={data?.interviewers ?? []}
            selected={selectedInterviewers}
            onChange={onInterviewerChange}
            disabled={loading}
          />
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Loading interviewer metrics…</div> : null}

      {!loading && !error ? (
        totals.length ? (
          <div className={styles.interviewerLayout}>
            <div className={styles.barList}>
              {totals.map((item) => {
                const width = maxInterviews ? Math.max((item.interviewCount / maxInterviews) * 100, 4) : 0;
                return (
                  <div key={item.id} className={styles.barRow}>
                    <span>{item.name}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barValue} style={{ width: `${width}%` }} />
                    </div>
                    <span className={styles.barValueLabel}>{item.interviewCount}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.interviewerMetricsGrid}>
              <article className={styles.metricPanel}>
                <h3 className={styles.metricPanelTitle}>Hire vs reject share</h3>
                <div className={styles.stackedList}>
                  {totals.map((item) => (
                    <div key={`share-${item.id}`} className={styles.stackedRow}>
                      <span className={styles.stackedLabelName}>{item.name}</span>
                      <div className={styles.stackedBar}>
                        <div
                          className={styles.stackedHire}
                          style={{ width: `${item.hireShare != null ? item.hireShare * 100 : 0}%` }}
                        />
                        <div
                          className={styles.stackedReject}
                          style={{ width: `${item.rejectShare != null ? item.rejectShare * 100 : 0}%` }}
                        />
                      </div>
                      <span className={styles.stackedValue}>
                        {formatPercentLabel(item.hireShare)} / {formatPercentLabel(item.rejectShare)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.metricPanel}>
                <h3 className={styles.metricPanelTitle}>Average case score</h3>
                <div className={styles.scoreList}>
                  {totals.map((item) => (
                    <div key={`case-${item.id}`} className={styles.scoreRow}>
                      <span className={styles.scoreLabel}>{item.name}</span>
                      <div className={styles.scoreTrack}>
                        <div
                          className={styles.scoreValue}
                          style={{ width: `${(item.caseAverage ?? 0) * 20}%` }}
                        />
                      </div>
                      <span className={styles.scoreNumber}>
                        {item.caseAverage != null ? item.caseAverage.toFixed(2) : 'n/a'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.metricPanel}>
                <h3 className={styles.metricPanelTitle}>Average fit score</h3>
                <div className={styles.scoreList}>
                  {totals.map((item) => (
                    <div key={`fit-${item.id}`} className={styles.scoreRow}>
                      <span className={styles.scoreLabel}>{item.name}</span>
                      <div className={styles.scoreTrack}>
                        <div
                          className={styles.scoreValueAlt}
                          style={{ width: `${(item.fitAverage ?? 0) * 20}%` }}
                        />
                      </div>
                      <span className={styles.scoreNumber}>
                        {item.fitAverage != null ? item.fitAverage.toFixed(2) : 'n/a'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No interviewer metrics for the selected period.</div>
        )
      ) : null}
    </section>
  );
};
