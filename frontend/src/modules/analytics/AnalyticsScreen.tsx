import { useCallback, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { SummarySection } from './components/SummarySection';
import { TimelineSection } from './components/TimelineSection';
import { InterviewerSection } from './components/InterviewerSection';
import { useAnalyticsSummary } from './hooks/useAnalyticsSummary';
import { useAnalyticsTimeline } from './hooks/useAnalyticsTimeline';
import { useAnalyticsInterviewers } from './hooks/useAnalyticsInterviewers';
import { analyticsApi } from './services/analyticsApi';
import type { SummaryPeriod, TimelineGrouping } from './types/analytics';

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerGrouping, setInterviewerGrouping] = useState<TimelineGrouping>('month');
  const [interviewerFrom, setInterviewerFrom] = useState<string | undefined>(undefined);
  const [interviewerTo, setInterviewerTo] = useState<string | undefined>(undefined);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerState = useAnalyticsInterviewers(interviewerGrouping, {
    from: interviewerFrom,
    to: interviewerTo,
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined
  });

  const downloadSummary = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('summary', { period: summaryPeriod });
    } catch (error) {
      console.error('Не удалось скачать сводный отчёт:', error);
      window.alert('Не удалось скачать файл. Попробуйте ещё раз.');
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
      console.error('Не удалось скачать временной ряд:', error);
      window.alert('Не удалось скачать файл. Попробуйте ещё раз.');
    }
  }, [timelineFrom, timelineGrouping, timelineTo]);

  const downloadInterviewers = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('interviewers', {
        groupBy: interviewerGrouping,
        from: interviewerFrom,
        to: interviewerTo,
        interviewers: selectedInterviewers.length ? selectedInterviewers.join(',') : undefined
      });
    } catch (error) {
      console.error('Не удалось скачать статистику интервьюеров:', error);
      window.alert('Не удалось скачать файл. Попробуйте ещё раз.');
    }
  }, [interviewerFrom, interviewerGrouping, interviewerTo, selectedInterviewers]);

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
        grouping={interviewerGrouping}
        onGroupingChange={setInterviewerGrouping}
        from={interviewerFrom}
        to={interviewerTo}
        onFromChange={setInterviewerFrom}
        onToChange={setInterviewerTo}
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={setSelectedInterviewers}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
        onDownload={downloadInterviewers}
      />
    </div>
  );
};
