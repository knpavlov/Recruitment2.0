import { useCallback, useMemo, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { SummarySection } from './components/SummarySection';
import { TimelineSection } from './components/TimelineSection';
import { InterviewerSection } from './components/InterviewerSection';
import { InterviewerTrendsSection } from './components/InterviewerTrendsSection';
import { useAnalyticsSummary } from './hooks/useAnalyticsSummary';
import { useAnalyticsTimeline } from './hooks/useAnalyticsTimeline';
import { useAnalyticsInterviewers } from './hooks/useAnalyticsInterviewers';
import { analyticsApi } from './services/analyticsApi';
import type { InterviewerPeriod, SummaryPeriod, TimelineGrouping } from './types/analytics';

const FISCAL_YEAR_START_MONTH = 3; // April (zero-based index)

const formatDateParam = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeInterviewerRange = (period: InterviewerPeriod) => {
  const end = new Date();
  const start = new Date(end);

  switch (period) {
    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'last_3_months':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'rolling_12':
      start.setMonth(start.getMonth() - 12);
      break;
    case 'fytd': {
      const fiscalStart = new Date(end.getFullYear(), FISCAL_YEAR_START_MONTH, 1);
      if (end.getMonth() < FISCAL_YEAR_START_MONTH) {
        fiscalStart.setFullYear(fiscalStart.getFullYear() - 1);
      }
      start.setTime(fiscalStart.getTime());
      break;
    }
    default:
      break;
  }

  return { from: formatDateParam(start), to: formatDateParam(end) };
};

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerPeriod, setInterviewerPeriod] = useState<InterviewerPeriod>('last_month');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);

  const interviewerRange = useMemo(() => computeInterviewerRange(interviewerPeriod), [interviewerPeriod]);

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerState = useAnalyticsInterviewers('month', {
    from: interviewerRange.from,
    to: interviewerRange.to,
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined
  });

  const downloadSummary = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('summary', { period: summaryPeriod });
    } catch (error) {
      console.error('Failed to download summary dataset:', error);
      window.alert('Failed to download the file. Please try again.');
    }
  }, [summaryPeriod]);

  const downloadTimeline = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('timeline', {
        groupBy: timelineGrouping,
        from: timelineFrom,
        to: timelineTo
      });
    } catch (error) {
      console.error('Failed to download timeline dataset:', error);
      window.alert('Failed to download the file. Please try again.');
    }
  }, [timelineFrom, timelineGrouping, timelineTo]);

  const downloadInterviewers = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('interviewers', {
        groupBy: 'month',
        from: interviewerRange.from,
        to: interviewerRange.to,
        interviewers: selectedInterviewers.length ? selectedInterviewers.join(',') : undefined
      });
    } catch (error) {
      console.error('Failed to download interviewer dataset:', error);
      window.alert('Failed to download the file. Please try again.');
    }
  }, [interviewerRange.from, interviewerRange.to, selectedInterviewers]);

  return (
    <div className={styles.screen}>
      <SummarySection
        period={summaryPeriod}
        onPeriodChange={setSummaryPeriod}
        data={summaryState.data}
        loading={summaryState.loading}
        error={summaryState.error}
        onDownload={downloadSummary}
      />

      <TimelineSection
        grouping={timelineGrouping}
        onGroupingChange={setTimelineGrouping}
        from={timelineFrom}
        to={timelineTo}
        onFromChange={setTimelineFrom}
        onToChange={setTimelineTo}
        data={timelineState.data}
        loading={timelineState.loading}
        error={timelineState.error}
        onDownload={downloadTimeline}
      />

      <InterviewerSection
        period={interviewerPeriod}
        onPeriodChange={setInterviewerPeriod}
        range={interviewerRange}
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={setSelectedInterviewers}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
        onDownload={downloadInterviewers}
      />

      <InterviewerTrendsSection
        period={interviewerPeriod}
        range={interviewerRange}
        data={interviewerState.data}
        selectedInterviewers={selectedInterviewers}
        loading={interviewerState.loading}
        error={interviewerState.error}
      />
    </div>
  );
};
