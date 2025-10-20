import { useMemo } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { INTERVIEWER_PERIOD_LABELS, INTERVIEWER_PERIOD_ORDER } from '../constants/interviewers';
import type { InterviewerPeriod, InterviewerStatsResponse } from '../types/analytics';

interface InterviewerSectionProps {
  period: InterviewerPeriod;
  onPeriodChange: (value: InterviewerPeriod) => void;
  selectedInterviewer: 'all' | string;
  onInterviewerChange: (id: 'all' | string) => void;
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
  selectedInterviewer,
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

    return Array.from(map.values()).sort((a, b) => b.interviewCount - a.interviewCount);
  }, [data]);

  const filteredTotals = useMemo(() => {
    if (selectedInterviewer === 'all') {
      return totals;
    }
    return totals.filter((item) => item.id === selectedInterviewer);
  }, [selectedInterviewer, totals]);

  const maxInterviews = filteredTotals.length
    ? Math.max(...filteredTotals.map((item) => item.interviewCount))
    : 0;

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Interviewer overview</h2>
          <p className={styles.metricDetails}>
            Compare workload, recommendations, and scores across interviewers
          </p>
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

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-filter">
            Interviewer filter
          </label>
          <select
            id="interviewer-filter"
            className={styles.select}
            value={selectedInterviewer}
            onChange={(event) => onInterviewerChange(event.target.value as 'all' | string)}
          >
            <option value="all">All interviewers</option>
            {data?.interviewers.map((interviewer) => (
              <option key={interviewer.id} value={interviewer.id}>
                {interviewer.name}
                {interviewer.email ? ` • ${interviewer.email}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Loading interviewer statistics…</div> : null}

      {!loading && !error ? (
        filteredTotals.length ? (
          <div className={styles.interviewerChartsGrid}>
            <div className={styles.chartPanel}>
              <h3 className={styles.chartTitle}>Completed interviews</h3>
              <div className={styles.barList}>
                {filteredTotals.map((item) => {
                  const width = maxInterviews ? Math.max((item.interviewCount / maxInterviews) * 100, 4) : 0;
                  return (
                    <div key={`volume-${item.id}`} className={styles.barRow}>
                      <span className={styles.barLabel}>{item.name}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barValue} style={{ width: `${width}%` }} />
                      </div>
                      <span className={styles.barValueLabel}>{item.interviewCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.chartPanel}>
              <h3 className={styles.chartTitle}>Hire vs reject share</h3>
              <div className={styles.stackedList}>
                {filteredTotals.map((item) => {
                  const decisions = item.hire + item.reject;
                  const hireShare = decisions ? (item.hire / decisions) * 100 : 0;
                  const rejectShare = decisions ? (item.reject / decisions) * 100 : 0;
                  return (
                    <div key={`decisions-${item.id}`} className={styles.stackedRow}>
                      <span className={styles.barLabel}>{item.name}</span>
                      <div className={styles.stackedTrack}>
                        <div className={styles.stackedHire} style={{ width: `${hireShare}%` }} />
                        <div className={styles.stackedReject} style={{ width: `${rejectShare}%` }} />
                      </div>
                      <span className={styles.stackedLegend}>
                        {formatPercent(item.hire, decisions)} hire / {formatPercent(item.reject, decisions)} reject
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.chartPanel}>
              <h3 className={styles.chartTitle}>Average case score</h3>
              <div className={styles.scoreList}>
                {filteredTotals.map((item) => {
                  const score = item.caseScoreCount ? item.caseScoreSum / item.caseScoreCount : null;
                  const width = score ? (Math.max(score, 0) / 5) * 100 : 0;
                  return (
                    <div key={`case-${item.id}`} className={styles.scoreRow}>
                      <span className={styles.barLabel}>{item.name}</span>
                      <div className={styles.scoreTrack}>
                        <div className={styles.scoreValue} style={{ width: `${width}%` }} />
                      </div>
                      <span className={styles.scoreLabel}>{score != null ? score.toFixed(2) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.chartPanel}>
              <h3 className={styles.chartTitle}>Average fit score</h3>
              <div className={styles.scoreList}>
                {filteredTotals.map((item) => {
                  const score = item.fitScoreCount ? item.fitScoreSum / item.fitScoreCount : null;
                  const width = score ? (Math.max(score, 0) / 5) * 100 : 0;
                  return (
                    <div key={`fit-${item.id}`} className={styles.scoreRow}>
                      <span className={styles.barLabel}>{item.name}</span>
                      <div className={styles.scoreTrack}>
                        <div className={styles.scoreValueAlt} style={{ width: `${width}%` }} />
                      </div>
                      <span className={styles.scoreLabel}>{score != null ? score.toFixed(2) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No interviewer data for the selected filters.</div>
        )
      ) : null}
    </section>
  );
};
