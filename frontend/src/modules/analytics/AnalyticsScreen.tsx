import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import {
  fetchAnalyticsInterviewers,
  fetchAnalyticsSummary,
  fetchAnalyticsTimeSeries,
  exportAnalyticsInterviewers,
  exportAnalyticsSummary,
  exportAnalyticsTimeSeries
} from './api/analyticsApi';
import { SummarySection } from './components/SummarySection';
import { TimeSeriesSection } from './components/TimeSeriesSection';
import { InterviewerSection } from './components/InterviewerSection';
import {
  AnalyticsInterviewersResponse,
  AnalyticsSummaryPeriod,
  AnalyticsSummaryResponse,
  AnalyticsTimeGranularity,
  AnalyticsTimeSeriesResponse
} from '../../shared/types/analytics';
import { addMonthsUtc, startOfDayUtc } from './dateUtils';

const computeRange = (preset: string) => {
  const now = startOfDayUtc(new Date());
  let months = 12;
  if (preset === '6m') {
    months = 6;
  } else if (preset === '24m') {
    months = 24;
  }
  const start = addMonthsUtc(now, -months + 1);
  return { start: start.toISOString(), end: now.toISOString() };
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<AnalyticsSummaryPeriod>('rolling-3-month');
  const [summaryData, setSummaryData] = useState<AnalyticsSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [timeSeriesGranularity, setTimeSeriesGranularity] =
    useState<AnalyticsTimeGranularity>('month');
  const [timeSeriesRange, setTimeSeriesRange] = useState('12m');
  const [timeSeriesData, setTimeSeriesData] = useState<AnalyticsTimeSeriesResponse | null>(null);
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(false);
  const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);

  const [interviewerGranularity, setInterviewerGranularity] =
    useState<AnalyticsTimeGranularity>('month');
  const [interviewerRange, setInterviewerRange] = useState('12m');
  const [interviewerData, setInterviewerData] = useState<AnalyticsInterviewersResponse | null>(null);
  const [interviewerLoading, setInterviewerLoading] = useState(false);
  const [interviewerError, setInterviewerError] = useState<string | null>(null);

  const timeSeriesRangeDates = useMemo(() => computeRange(timeSeriesRange), [timeSeriesRange]);
  const interviewerRangeDates = useMemo(() => computeRange(interviewerRange), [interviewerRange]);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    fetchAnalyticsSummary(summaryPeriod)
      .then((response) => {
        if (!cancelled) {
          setSummaryData(response);
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки сводки аналитики:', error);
        if (!cancelled) {
          setSummaryError('Не удалось загрузить метрики.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [summaryPeriod]);

  useEffect(() => {
    let cancelled = false;
    setTimeSeriesLoading(true);
    setTimeSeriesError(null);
    fetchAnalyticsTimeSeries({
      start: timeSeriesRangeDates.start,
      end: timeSeriesRangeDates.end,
      granularity: timeSeriesGranularity
    })
      .then((response) => {
        if (!cancelled) {
          setTimeSeriesData(response);
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки временного ряда аналитики:', error);
        if (!cancelled) {
          setTimeSeriesError('Не удалось загрузить временной ряд.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTimeSeriesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [timeSeriesGranularity, timeSeriesRangeDates.start, timeSeriesRangeDates.end]);

  useEffect(() => {
    let cancelled = false;
    setInterviewerLoading(true);
    setInterviewerError(null);
    fetchAnalyticsInterviewers({
      start: interviewerRangeDates.start,
      end: interviewerRangeDates.end,
      granularity: interviewerGranularity
    })
      .then((response) => {
        if (!cancelled) {
          setInterviewerData(response);
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки статистики интервьюеров:', error);
        if (!cancelled) {
          setInterviewerError('Не удалось загрузить статистику интервьюеров.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInterviewerLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [interviewerGranularity, interviewerRangeDates.start, interviewerRangeDates.end]);

  const handleExportSummary = async () => {
    const blob = await exportAnalyticsSummary(summaryPeriod);
    downloadBlob(blob, 'analytics-summary.csv');
  };

  const handleExportTimeSeries = async () => {
    const blob = await exportAnalyticsTimeSeries({
      start: timeSeriesRangeDates.start,
      end: timeSeriesRangeDates.end,
      granularity: timeSeriesGranularity
    });
    downloadBlob(blob, 'analytics-time-series.csv');
  };

  const handleExportInterviewers = async () => {
    const blob = await exportAnalyticsInterviewers({
      start: interviewerRangeDates.start,
      end: interviewerRangeDates.end,
      granularity: interviewerGranularity
    });
    downloadBlob(blob, 'analytics-interviewers.csv');
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>Analytics</h1>
        <p className={styles.subtitle}>
          Комплексный обзор воронки найма, эффективности интервьюеров и ключевых метрик DEI.
        </p>
      </header>
      <SummarySection
        period={summaryPeriod}
        onChangePeriod={setSummaryPeriod}
        data={summaryData}
        isLoading={summaryLoading}
        error={summaryError}
        onExport={handleExportSummary}
      />
      <TimeSeriesSection
        granularity={timeSeriesGranularity}
        rangePreset={timeSeriesRange}
        onChangeGranularity={setTimeSeriesGranularity}
        onChangeRangePreset={setTimeSeriesRange}
        data={timeSeriesData}
        isLoading={timeSeriesLoading}
        error={timeSeriesError}
        onExport={handleExportTimeSeries}
      />
      <InterviewerSection
        granularity={interviewerGranularity}
        rangePreset={interviewerRange}
        onChangeGranularity={setInterviewerGranularity}
        onChangeRangePreset={setInterviewerRange}
        data={interviewerData}
        isLoading={interviewerLoading}
        error={interviewerError}
        onExport={handleExportInterviewers}
      />
    </div>
  );
};
