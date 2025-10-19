import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import {
  AnalyticsInterviewerStats,
  AnalyticsInterviewersResponse,
  AnalyticsTimeGranularity
} from '../../../shared/types/analytics';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { formatDate } from '../../../shared/utils/date';
import { formatInteger, formatScore } from '../utils/format';
import { ExportButton } from './ExportButton';
import { SimpleLineChart } from './SimpleLineChart';

interface InterviewerSectionProps {
  granularity: AnalyticsTimeGranularity;
  rangePreset: string;
  onChangeGranularity: (granularity: AnalyticsTimeGranularity) => void;
  onChangeRangePreset: (preset: string) => void;
  data: AnalyticsInterviewersResponse | null;
  isLoading: boolean;
  error: string | null;
  onExport: () => Promise<void>;
}

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '6m', label: '6 месяцев' },
  { value: '12m', label: '12 месяцев' },
  { value: '24m', label: '24 месяца' }
];

const COLORS = ['#6366f1', '#22d3ee', '#f97316', '#10b981', '#a855f7', '#ef4444', '#0ea5e9'];

const interviewerKey = (item: AnalyticsInterviewerStats) => item.interviewerEmail ?? item.interviewerName;

interface TimelinePoint {
  label: string;
  values: Record<string, number>;
}

const buildTimeline = (interviewers: AnalyticsInterviewerStats[], selectedKeys: string[]): TimelinePoint[] => {
  const map = new Map<string, TimelinePoint>();
  for (const interviewer of interviewers) {
    const key = interviewerKey(interviewer);
    if (!selectedKeys.includes(key)) {
      continue;
    }
    interviewer.timeline.forEach((point) => {
      const existing = map.get(point.periodStart);
      if (existing) {
        existing.values[key] = point.interviews;
      } else {
        map.set(point.periodStart, {
          label: `${formatDate(point.periodStart)} — ${formatDate(point.periodEnd)}`,
          values: { [key]: point.interviews }
        });
      }
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
};

export const InterviewerSection = ({
  granularity,
  rangePreset,
  onChangeGranularity,
  onChangeRangePreset,
  data,
  isLoading,
  error,
  onExport
}: InterviewerSectionProps) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!data) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys((current) => {
      const available = data.interviewers.map((item) => interviewerKey(item));
      const preserved = current.filter((key) => available.includes(key));
      if (preserved.length > 0) {
        return preserved;
      }
      return available.slice(0, Math.min(4, available.length));
    });
  }, [data]);

  const toggleInterviewer = (key: string) => {
    setSelectedKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  };

  const timelineData = useMemo(() => {
    if (!data) {
      return [];
    }
    return buildTimeline(data.interviewers, selectedKeys);
  }, [data, selectedKeys]);

  const filteredInterviewers = useMemo(() => {
    if (!data) {
      return [] as AnalyticsInterviewersResponse['availableInterviewers'];
    }
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return data.availableInterviewers;
    }
    return data.availableInterviewers.filter((item) => {
      const name = item.interviewerName.toLowerCase();
      const email = item.interviewerEmail?.toLowerCase() ?? '';
      return name.includes(normalized) || email.includes(normalized);
    });
  }, [data, searchTerm]);

  const colorByKey = useMemo(() => {
    if (!data) {
      return new Map<string, string>();
    }
    return new Map(
      data.availableInterviewers.map((item, index) => [
        item.interviewerEmail ?? item.interviewerName,
        COLORS[index % COLORS.length]
      ])
    );
  }, [data]);

  const displayedInterviewers = useMemo(() => {
    if (!data) {
      return [] as AnalyticsInterviewerStats[];
    }
    const map = new Map(data.interviewers.map((item) => [interviewerKey(item), item]));
    return selectedKeys.map((key) => map.get(key)).filter((item): item is AnalyticsInterviewerStats => Boolean(item));
  }, [data, selectedKeys]);

  const handleGranularityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangeGranularity(event.target.value as AnalyticsTimeGranularity);
  };

  const handleRangeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangeRangePreset(event.target.value);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Интервьюеры</h2>
          <p className={styles.subtitle}>
            Анализ загрузки интервьюеров, средних баллов и рекомендаций по кандидатам.
          </p>
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
      {isLoading && <p className={styles.loading}>Загрузка статистики…</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      {!isLoading && !error && data && (
        <div className={styles.interviewersLayout}>
          <div className={styles.interviewersContent}>
            <div className={styles.interviewerChartContainer}>
              {timelineData.length > 0 && displayedInterviewers.length > 0 ? (
                <SimpleLineChart
                  points={timelineData}
                  series={displayedInterviewers.map((interviewer, index) => {
                    const key = interviewerKey(interviewer);
                    return {
                      key,
                      label: interviewer.interviewerName,
                      color: colorByKey.get(key) ?? COLORS[index % COLORS.length],
                      formatter: (value: number) => formatInteger(value)
                    };
                  })}
                />
              ) : (
                <p className={styles.loading}>Выберите интервьюеров для сравнения.</p>
              )}
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.summaryTable}>
                <thead>
                  <tr>
                    <th>Интервьюер</th>
                    <th>Интервью</th>
                    <th>Кейс</th>
                    <th>Фит</th>
                    <th>Hire</th>
                    <th>Reject</th>
                    <th>Прочие</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedInterviewers.map((item) => (
                    <tr key={interviewerKey(item)}>
                      <td>{item.interviewerName}</td>
                      <td>{formatInteger(item.interviews)}</td>
                      <td>{formatScore(item.averageCaseScore)}</td>
                      <td>{formatScore(item.averageFitScore)}</td>
                      <td>{formatInteger(item.hireRecommendations)}</td>
                      <td>{formatInteger(item.rejectRecommendations)}</td>
                      <td>{formatInteger(item.otherRecommendations)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className={styles.subtitle}>Фильтр интервьюеров</h3>
            <div className={styles.filterSearch}>
              <input
                type="search"
                value={searchTerm}
                placeholder="Поиск по имени или e-mail"
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')}>
                  Очистить
                </button>
              )}
            </div>
            <div className={styles.filterList}>
              {filteredInterviewers.map((item, index) => {
                const key = item.interviewerEmail ?? item.interviewerName;
                const color = colorByKey.get(key) ?? COLORS[index % COLORS.length];
                const isChecked = selectedKeys.includes(key);
                return (
                  <label key={key} className={styles.filterItem}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleInterviewer(key)}
                    />
                    <span
                      className={styles.legendDot}
                      style={{ background: color, flexShrink: 0 }}
                    />
                    <span>{item.interviewerName}</span>
                    {item.interviewerEmail && (
                      <span style={{ color: '#64748b', fontSize: 12 }}>({item.interviewerEmail})</span>
                    )}
                  </label>
                );
              })}
              {!filteredInterviewers.length && (
                <p className={styles.loading}>Не найдено интервьюеров по данному запросу.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {!isLoading && !error && !data && <p className={styles.loading}>Нет данных по интервьюерам.</p>}
    </section>
  );
};
