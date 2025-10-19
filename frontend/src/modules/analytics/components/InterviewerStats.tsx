import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { InterviewerAggregateStats } from '../types';
import {
  aggregateInterviewers,
  AggregatedInterviewerRow,
  INTERVIEWER_RANGE_OPTIONS,
  InterviewerRangeKey,
  summarizeInterviewers
} from '../services/interviewerAggregations';

interface InterviewerStatsProps {
  interviewers: InterviewerAggregateStats[];
  onExport: (params: { interviewerIds: string[]; range: InterviewerRangeKey }) => void;
}

export const InterviewerStats = ({ interviewers, onExport }: InterviewerStatsProps) => {
  const [selectedRange, setSelectedRange] = useState<InterviewerRangeKey>('12w');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => interviewers.map((item) => item.interviewerId));

  useEffect(() => {
    setSelectedIds((prev) => {
      const known = new Set(prev);
      const next = interviewers
        .filter((item) => known.has(item.interviewerId))
        .map((item) => item.interviewerId);
      if (next.length === 0) {
        return interviewers.map((item) => item.interviewerId);
      }
      return next;
    });
  }, [interviewers]);

  const aggregated = useMemo(
    () => aggregateInterviewers(interviewers, selectedIds, selectedRange),
    [interviewers, selectedIds, selectedRange]
  );

  const summary = useMemo(() => summarizeInterviewers(aggregated), [aggregated]);

  const toggleInterviewer = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Статистика интервьюеров</h2>
          <p className={styles.headerSubtitle}>Нагрузка, оценки и решения по выбранным интервьюерам</p>
        </div>
        <button
          type="button"
          className={styles.exportButton}
          onClick={() => onExport({ interviewerIds: selectedIds, range: selectedRange })}
        >
          Экспорт интервьюеров
        </button>
      </div>
      <div className={styles.interviewerControls}>
        <div className={styles.periodSelector}>
          {INTERVIEWER_RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`${styles.periodButton} ${option.key === selectedRange ? styles.periodButtonActive : ''}`}
              onClick={() => setSelectedRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.interviewerSummary}>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Интервью за период</span>
          <span className={styles.summaryStatValue}>{summary.totalInterviews}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Средний кейс балл</span>
          <span className={styles.summaryStatValue}>
            {summary.avgCase === null ? '—' : summary.avgCase.toFixed(1)}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Средний фит балл</span>
          <span className={styles.summaryStatValue}>
            {summary.avgFit === null ? '—' : summary.avgFit.toFixed(1)}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Hire рекомендации</span>
          <span className={styles.summaryStatValue}>{summary.positive}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.summaryStatLabel}>Reject рекомендации</span>
          <span className={styles.summaryStatValue}>{summary.negative}</span>
        </div>
      </div>
      <div className={styles.interviewerControls}>
        <div className={styles.interviewerList}>
          {interviewers.map((interviewer) => (
            <label key={interviewer.interviewerId} className={styles.interviewerOption}>
              <input
                type="checkbox"
                checked={selectedIds.includes(interviewer.interviewerId)}
                onChange={() => toggleInterviewer(interviewer.interviewerId)}
              />
              <span>{interviewer.interviewerName}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.tableWrapper}>
        {aggregated.length === 0 ? (
          <p className={styles.emptyState}>Выберите интервьюеров и временной диапазон, чтобы увидеть статистику.</p>
        ) : (
          <table className={styles.interviewerTable}>
            <thead>
              <tr>
                <th>Интервьюер</th>
                <th>Интервью</th>
                <th>Кейс балл</th>
                <th>Фит балл</th>
                <th>Hire</th>
                <th>Reject</th>
                <th>Последние периоды</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.interviews}</td>
                  <td>{row.avgCaseScore === null ? '—' : row.avgCaseScore.toFixed(1)}</td>
                  <td>{row.avgFitScore === null ? '—' : row.avgFitScore.toFixed(1)}</td>
                  <td>{row.positive}</td>
                  <td>{row.negative}</td>
                  <td>{row.recent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
