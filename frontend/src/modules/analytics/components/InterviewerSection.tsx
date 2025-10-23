import { useMemo } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerPeriod, InterviewerSeniority, InterviewerStatsResponse } from '../types/analytics';
import { buildInterviewerTotals } from '../utils/interviewerTotals';
import { InterviewerFilters } from './InterviewerFilters';

const INTERVIEWER_PERIOD_LABELS: Record<InterviewerPeriod, string> = {
  last_month: '1 month',
  rolling_3: 'Trailing 3 months',
  fytd: 'Financial year to date',
  rolling_12: 'Trailing 12 months'
};

const INTERVIEWER_PERIOD_ORDER: InterviewerPeriod[] = ['last_month', 'rolling_3', 'fytd', 'rolling_12'];

interface InterviewerSectionProps {
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
  error,
  onDownload
}: InterviewerSectionProps) => {
  const totals = useMemo(() => buildInterviewerTotals(data), [data]);
  const maxInterviews = totals.length ? Math.max(...totals.map((item) => item.interviewCount)) : 0;
  const topRows = totals.slice(0, 10);
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

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Loading interviewer statistics…</div> : null}

      {!loading && !error ? (
        totals.length ? (
          <div className={styles.interviewerInsightsGrid}>
            <div className={styles.interviewerInsightsHeader}>
              <span>Interview volume</span>
              <span>Hire vs reject</span>
              <span>Average case score</span>
              <span>Average fit score</span>
            </div>
            {topRows.map((item) => {
              const decisions = item.hire + item.reject;
              const hireShare = decisions ? (item.hire / decisions) * 100 : 0;
              const rejectShare = decisions ? (item.reject / decisions) * 100 : 0;
              const caseAvg = item.caseScoreCount ? item.caseScoreSum / item.caseScoreCount : null;
              const fitAvg = item.fitScoreCount ? item.fitScoreSum / item.fitScoreCount : null;
              const interviewWidth = maxInterviews ? (item.interviewCount / maxInterviews) * 100 : 0;
              const caseWidth = caseAvg ? (caseAvg / MAX_SCORE) * 100 : 0;
              const fitWidth = fitAvg ? (fitAvg / MAX_SCORE) * 100 : 0;

              return (
                <div key={item.id} className={styles.interviewerInsightsRow}>
                  <div className={styles.insightNameCell}>
                    <span className={styles.insightName}>{item.name}</span>
                    <div className={styles.insightBarTrack}>
                      <div className={styles.insightBarValue} style={{ width: `${interviewWidth}%` }} />
                    </div>
                    <span className={styles.insightValueLabel}>{item.interviewCount}</span>
                  </div>
                  <div className={styles.insightStackedCell}>
                    <div className={styles.insightStackedBar}>
                      <div className={styles.insightStackedHire} style={{ width: `${hireShare}%` }} />
                      <div className={styles.insightStackedReject} style={{ width: `${rejectShare}%` }} />
                    </div>
                    <span className={styles.insightValueLabel}>{formatPercent(item.hire, decisions)}</span>
                  </div>
                  <div className={styles.insightScoreCell}>
                    <div className={styles.insightScoreTrack}>
                      <div className={styles.insightCaseBar} style={{ width: `${caseWidth}%` }} />
                    </div>
                    <span className={styles.insightValueLabel}>{formatScore(item.caseScoreSum, item.caseScoreCount)}</span>
                  </div>
                  <div className={styles.insightScoreCell}>
                    <div className={styles.insightScoreTrack}>
                      <div className={styles.insightFitBar} style={{ width: `${fitWidth}%` }} />
                    </div>
                    <span className={styles.insightValueLabel}>{formatScore(item.fitScoreSum, item.fitScoreCount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.timelineEmpty}>No data for the selected parameters.</div>
        )
      ) : null}
    </section>
  );
};
