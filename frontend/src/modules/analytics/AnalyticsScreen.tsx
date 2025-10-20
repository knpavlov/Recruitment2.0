import { useCallback, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { SummarySection } from './components/SummarySection';
import { TimelineSection } from './components/TimelineSection';
import { InterviewerSection } from './components/InterviewerSection';
import { useAnalyticsSummary } from './hooks/useAnalyticsSummary';
import { useAnalyticsTimeline } from './hooks/useAnalyticsTimeline';
import { useAnalyticsInterviewers } from './hooks/useAnalyticsInterviewers';
import { InterviewerTrendsSection } from './components/InterviewerTrendsSection';
import { analyticsApi } from './services/analyticsApi';
import type { InterviewerPeriod, SummaryPeriod, TimelineGrouping } from './types/analytics';

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerPeriod, setInterviewerPeriod] = useState<InterviewerPeriod>('last_month');
  const [selectedInterviewer, setSelectedInterviewer] = useState<'all' | string>('all');

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerState = useAnalyticsInterviewers(interviewerPeriod);

  const downloadSummary = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('summary', { period: summaryPeriod });
    } catch (error) {
      console.error('Failed to download summary dataset:', error);
      window.alert('Download failed. Please try again.');
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
      window.alert('Download failed. Please try again.');
    }
  }, [timelineFrom, timelineGrouping, timelineTo]);

  const downloadInterviewers = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('interviewers', {
        groupBy: 'month',
        from: interviewerState.range.from,
        to: interviewerState.range.to,
        interviewers: selectedInterviewer !== 'all' ? selectedInterviewer : undefined
      });
    } catch (error) {
      console.error('Failed to download interviewer dataset:', error);
      window.alert('Download failed. Please try again.');
    }
  }, [interviewerState.range.from, interviewerState.range.to, selectedInterviewer]);

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
        selectedInterviewer={selectedInterviewer}
        onInterviewerChange={(value) => setSelectedInterviewer(value)}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
        onDownload={downloadInterviewers}
      />

      <InterviewerTrendsSection
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
        period={interviewerPeriod}
        selectedInterviewer={selectedInterviewer}
      />
    </div>
  );
};
