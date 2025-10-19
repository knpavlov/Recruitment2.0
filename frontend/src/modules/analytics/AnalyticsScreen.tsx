import { useMemo, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { useAnalyticsDataset } from './hooks/useAnalyticsDataset';
import { SummaryCards } from './components/SummaryCards';
import { PipelineChart } from './components/PipelineChart';
import { InterviewerStats } from './components/InterviewerStats';
import { SummaryPeriod, TimeGranularity } from './types';
import { exportCsv } from './services/csvExport';
import { aggregateInterviewers, InterviewerRangeKey } from './services/interviewerAggregations';

const SUMMARY_LABELS: Record<SummaryPeriod, string> = {
  'rolling-3': 'Скользящая 3 месяца',
  'fy-to-date': 'С начала финансового года',
  'rolling-12': 'Скользящая 12 месяцев'
};

export const AnalyticsScreen = () => {
  const dataset = useAnalyticsDataset();
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling-3');
  const [granularity, setGranularity] = useState<TimeGranularity>('month');

  const summaryMetrics = useMemo(() => {
    const entry = dataset.summaries.find((item) => item.period === summaryPeriod);
    return entry?.metrics ?? [];
  }, [dataset.summaries, summaryPeriod]);

  const handleSummaryExport = () => {
    const columns = [
      { key: 'period', title: 'Период' },
      { key: 'metric', title: 'Метрика' },
      { key: 'value', title: 'Значение' },
      { key: 'trend', title: 'Комментарий' }
    ];
    const rows = dataset.summaries.flatMap((entry) =>
      entry.metrics.map((metric) => ({
        period: SUMMARY_LABELS[entry.period],
        metric: metric.label,
        value: metric.value === null ? '' : metric.value.toFixed(2),
        trend: metric.trendLabel
      }))
    );
    exportCsv('analytics_summary.csv', columns, rows);
  };

  const handleTimelineExport = () => {
    const timeline = dataset.timelines[granularity];
    const columns = [
      { key: 'period', title: 'Период' },
      { key: 'resumes', title: 'Резюме' },
      { key: 'firstRoundInterviews', title: 'Интервью 1 раунд' },
      { key: 'secondRoundInterviews', title: 'Интервью 2 раунд' },
      { key: 'totalInterviews', title: 'Всего интервью' },
      { key: 'rejects', title: 'Реджекты' },
      { key: 'offers', title: 'Офферы' },
      { key: 'avgCaseScore', title: 'Средний кейс балл' },
      { key: 'avgFitScore', title: 'Средний фит балл' },
      { key: 'femaleShare', title: 'Доля женщин %' }
    ];
    const rows = timeline.points.map((point) => ({
      period: point.label,
      resumes: point.resumes,
      firstRoundInterviews: point.firstRoundInterviews,
      secondRoundInterviews: point.secondRoundInterviews,
      totalInterviews: point.totalInterviews,
      rejects: point.rejects,
      offers: point.offers,
      avgCaseScore: point.avgCaseScore ?? '',
      avgFitScore: point.avgFitScore ?? '',
      femaleShare: point.femaleShare === null ? '' : point.femaleShare.toFixed(1)
    }));
    exportCsv(`analytics_pipeline_${granularity}.csv`, columns, rows);
  };

  const handleInterviewerExport = ({ interviewerIds, range }: { interviewerIds: string[]; range: InterviewerRangeKey }) => {
    const effectiveIds = interviewerIds.length ? interviewerIds : dataset.interviewers.map((item) => item.interviewerId);
    const rows = aggregateInterviewers(dataset.interviewers, effectiveIds, range).map((row) => ({
      name: row.name,
      interviews: row.interviews,
      avgCaseScore: row.avgCaseScore === null ? '' : row.avgCaseScore.toFixed(2),
      avgFitScore: row.avgFitScore === null ? '' : row.avgFitScore.toFixed(2),
      positive: row.positive,
      negative: row.negative,
      recent: row.recent
    }));
    const columns = [
      { key: 'name', title: 'Интервьюер' },
      { key: 'interviews', title: 'Интервью' },
      { key: 'avgCaseScore', title: 'Кейс балл' },
      { key: 'avgFitScore', title: 'Фит балл' },
      { key: 'positive', title: 'Hire рекомендации' },
      { key: 'negative', title: 'Reject рекомендации' },
      { key: 'recent', title: 'Последние периоды' }
    ];
    exportCsv(`analytics_interviewers_${range}.csv`, columns, rows);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Analytics</h1>
        <p className={styles.headerSubtitle}>
          Глубокий взгляд на воронку подбора, конверсию офферов и эффективность интервьюеров
        </p>
      </header>
      <SummaryCards
        metrics={summaryMetrics}
        activePeriod={summaryPeriod}
        onPeriodChange={setSummaryPeriod}
        onExport={handleSummaryExport}
      />
      <PipelineChart
        timelines={dataset.timelines}
        activeGranularity={granularity}
        onGranularityChange={setGranularity}
        onExport={handleTimelineExport}
      />
      <InterviewerStats interviewers={dataset.interviewers} onExport={handleInterviewerExport} />
    </div>
  );
};
