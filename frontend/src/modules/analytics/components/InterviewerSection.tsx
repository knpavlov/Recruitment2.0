import { useMemo } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerStatsResponse, TimelineGrouping } from '../types/analytics';

interface InterviewerSectionProps {
  grouping: TimelineGrouping;
  onGroupingChange: (value: TimelineGrouping) => void;
  from?: string;
  to?: string;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
  selectedInterviewers: string[];
  onInterviewerChange: (ids: string[]) => void;
  data: InterviewerStatsResponse | null;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

const GROUPING_LABELS: Record<TimelineGrouping, string> = {
  week: 'Недельный',
  month: 'Помесячный',
  quarter: 'Поквартальный'
};

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
  grouping,
  onGroupingChange,
  from,
  to,
  onFromChange,
  onToChange,
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

  const maxInterviews = totals.length ? Math.max(...totals.map((item) => item.interviewCount)) : 0;

  const defaultFrom = data ? data.range.start.slice(0, 10) : '';
  const defaultTo = data ? data.range.end.slice(0, 10) : '';

  const interviewerSet = new Set(selectedInterviewers.map((id) => id.toLowerCase()));

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
  };

  const handleReset = () => {
    onInterviewerChange([]);
  };

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Статистика по интервьюерам</h2>
          <p className={styles.metricDetails}>Сравнение нагрузки, оценок и рекомендаций</p>
        </div>
        <div className={styles.sectionActions}>
          <button type="button" className={styles.secondaryButton} onClick={onDownload}>
            Экспортировать CSV
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-grouping">
            Период агрегации
          </label>
          <select
            id="interviewer-grouping"
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
          <label className={styles.inputLabel} htmlFor="interviewer-from">
            Начало периода
          </label>
          <input
            id="interviewer-from"
            type="date"
            className={styles.dateInput}
            value={from ?? defaultFrom}
            onChange={(event) => onFromChange(event.target.value || undefined)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="interviewer-to">
            Конец периода
          </label>
          <input
            id="interviewer-to"
            type="date"
            className={styles.dateInput}
            value={to ?? defaultTo}
            onChange={(event) => onToChange(event.target.value || undefined)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Фильтр интервьюеров</label>
          <div className={styles.sectionActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleSelectAll}>
              Выбрать всех
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className={styles.multiSelectList}>
        {data?.interviewers.map((interviewer) => {
          const isChecked = interviewerSet.has(interviewer.id.toLowerCase());
          return (
            <label key={interviewer.id} className={styles.multiSelectOption}>
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
        {!data?.interviewers.length ? <span>Интервьюеры не найдены.</span> : null}
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {loading ? <div className={styles.loadingLabel}>Загружаем статистику…</div> : null}

      {!loading && !error ? (
        totals.length ? (
          <>
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

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Интервьюер</th>
                    <th>Интервью</th>
                    <th>Hire</th>
                    <th>Reject</th>
                    <th>Конверсия</th>
                    <th>Балл кейс</th>
                    <th>Балл фит</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => {
                    const decisions = item.hire + item.reject;
                    return (
                      <tr key={`table-${item.id}`}>
                        <td>
                          <div>{item.name}</div>
                          {item.email ? <div className={styles.metricDetails}>{item.email}</div> : null}
                        </td>
                        <td>{item.interviewCount}</td>
                        <td>{item.hire}</td>
                        <td>{item.reject}</td>
                        <td>{formatPercent(item.hire, decisions)}</td>
                        <td>{formatScore(item.caseScoreSum, item.caseScoreCount)}</td>
                        <td>{formatScore(item.fitScoreSum, item.fitScoreCount)}</td>
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
