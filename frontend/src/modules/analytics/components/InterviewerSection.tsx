import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';
import { buildInterviewerTotals } from '../utils/interviewerTotals';

const INTERVIEWER_PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: 'Last month',
  rolling_3: 'Trailing 3 months',
  fytd: 'Financial year to date',
  rolling_12: 'Trailing 12 months'
};

const INTERVIEWER_PERIOD_ORDER: InterviewerPeriod[] = ['last_month', 'rolling_3', 'fytd', 'rolling_12'];

interface InterviewerSectionProps {
  period: InterviewerPeriod;
  onPeriodChange: (value: InterviewerPeriod) => void;
  selectedInterviewers: string[];
  onInterviewerChange: (ids: string[]) => void;
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

const formatScore = (sum: number, count: number) => {
  if (!count) {
    return '—';
  }
  return (sum / count).toFixed(2);
};

const formatPercent = (numerator: number, denominator: number) => {
  if (!denominator) {
    return '—';
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
};

export const InterviewerSection = ({
  period,
  onPeriodChange,
  selectedInterviewers,
  onInterviewerChange,
  data,
  loading,
  error,
  onDownload
}: InterviewerSectionProps) => {
  const totals = useMemo(() => buildInterviewerTotals(data), [data]);
  const maxInterviews = totals.length ? Math.max(...totals.map((item) => item.interviewCount)) : 0;
  const interviewerSet = new Set(selectedInterviewers.map((id) => id.toLowerCase()));
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggle = (id: string) => {
    const normalized = id.toLowerCase();
    onInterviewerChange(
      interviewerSet.has(normalized)
        ? selectedInterviewers.filter((value) => value.toLowerCase() !== normalized)
        : [...selectedInterviewers, id]
    );
  };

  const handleSelectAll = () => {
    if (!data) {
      return;
    }
    onInterviewerChange(data.interviewers.map((item) => item.id));
    setSelectorOpen(false);
  };

  const handleReset = () => {
    onInterviewerChange([]);
    setSelectorOpen(false);
  };

  const selectedCount = selectedInterviewers.length;
  const selectorLabel = selectedCount ? `${selectedCount} selected` : 'All interviewers';
  const topRows = totals.slice(0, 8);
  const MAX_SCORE = 5;

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer insights</h2>
          <p className={styles.metricDetails}>{INTERVIEWER_PERIOD_LABELS[period]}</p>
        </div>
        <div className={styles.sectionActions}>
          <div className={styles.toggleGroup}>
            {INTERVIEWER_PERIOD_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.toggleButton} ${period === option ? styles.toggleButtonActive : ''}`}
                onClick={() => onPeriodChange(option)}
              >
                {INTERVIEWER_PERIOD_LABELS[option]}
              </button>
            ))}
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onDownload}>
            Export CSV
          </button>
        </div>
      </header>

      <div className={styles.interviewerFilters}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Interviewer filter</label>
          <div className={styles.dropdownWrapper} ref={selectorRef}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelectorOpen((state) => !state)}
            >
              {selectorLabel}
            </button>
            {selectorOpen ? (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownActions}>
                  <button type="button" onClick={handleSelectAll}>
                    Select all
                  </button>
                  <button type="button" onClick={handleReset}>
                    Clear
                  </button>
                </div>
                <div className={styles.dropdownList}>
                  {data?.interviewers.map((interviewer) => {
                    const isChecked = interviewerSet.has(interviewer.id.toLowerCase());
                    return (
                      <label key={interviewer.id} className={styles.dropdownOption}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(interviewer.id)}
                        />
                        <span>
                          {interviewer.name}
                          {interviewer.email ? <span className={styles.badge}>{interviewer.email}</span> : null}
                        </span>
                      </label>
                    );
                  })}
                  {!data?.interviewers.length ? <span>No interviewers available.</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Loading interviewer statistics…</div> : null}

      {!loading && !error ? (
        totals.length ? (
          <div className={styles.interviewerGrid}>
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

            <div className={styles.interviewerMiniCharts}>
              <article className={styles.miniChartCard}>
                <h3>Hire vs reject share</h3>
                <div className={styles.miniChartBody}>
                  {topRows.map((item) => {
                    const decisions = item.hire + item.reject;
                    const hireShare = decisions ? (item.hire / decisions) * 100 : 0;
                    const rejectShare = decisions ? (item.reject / decisions) * 100 : 0;
                    return (
                      <div key={`decision-${item.id}`} className={styles.miniChartRow}>
                        <span className={styles.miniChartLabel}>{item.name}</span>
                        <div className={styles.miniStackedBar}>
                          <div className={styles.miniStackedHire} style={{ width: `${hireShare}%` }} />
                          <div className={styles.miniStackedReject} style={{ width: `${rejectShare}%` }} />
                        </div>
                        <span className={styles.miniChartValue}>{formatPercent(item.hire, decisions)}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.miniChartCard}>
                <h3>Average case score</h3>
                <div className={styles.miniChartBody}>
                  {topRows.map((item) => {
                    const avg = item.caseScoreCount ? item.caseScoreSum / item.caseScoreCount : null;
                    const width = avg ? (avg / MAX_SCORE) * 100 : 0;
                    return (
                      <div key={`case-${item.id}`} className={styles.miniChartRow}>
                        <span className={styles.miniChartLabel}>{item.name}</span>
                        <div className={styles.miniBarTrack}>
                          <div className={styles.miniCaseBar} style={{ width: `${width}%` }} />
                        </div>
                        <span className={styles.miniChartValue}>{avg ? avg.toFixed(2) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.miniChartCard}>
                <h3>Average fit score</h3>
                <div className={styles.miniChartBody}>
                  {topRows.map((item) => {
                    const avg = item.fitScoreCount ? item.fitScoreSum / item.fitScoreCount : null;
                    const width = avg ? (avg / MAX_SCORE) * 100 : 0;
                    return (
                      <div key={`fit-${item.id}`} className={styles.miniChartRow}>
                        <span className={styles.miniChartLabel}>{item.name}</span>
                        <div className={styles.miniBarTrack}>
                          <div className={styles.miniFitBar} style={{ width: `${width}%` }} />
                        </div>
                        <span className={styles.miniChartValue}>{avg ? avg.toFixed(2) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No data for the selected parameters.</div>
        )
      ) : null}
    </section>
  );
};
