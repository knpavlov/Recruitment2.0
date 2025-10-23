import { useCallback, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { SummarySection } from './components/SummarySection';
import { TimelineSection } from './components/TimelineSection';
import { InterviewerSection } from './components/InterviewerSection';
import { InterviewerGraphSection } from './components/InterviewerGraphSection';
import { useAnalyticsSummary } from './hooks/useAnalyticsSummary';
import { useAnalyticsTimeline } from './hooks/useAnalyticsTimeline';
import { useAnalyticsInterviewers } from './hooks/useAnalyticsInterviewers';
import { analyticsApi } from './services/analyticsApi';
import type { InterviewerPeriod, SummaryPeriod, TimelineGrouping } from './types/analytics';
import type { InterviewerSeniority } from '../../shared/types/account';

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerPeriod, setInterviewerPeriod] = useState<InterviewerPeriod>('last_month');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<InterviewerSeniority[]>([]);

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerState = useAnalyticsInterviewers(interviewerPeriod, {
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined,
    roles: selectedRoles.length ? selectedRoles : undefined
  });

  const downloadSummary = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('summary', { period: summaryPeriod });
    } catch (error) {
      console.error('Unable to download summary report:', error);
      window.alert('Unable to download the file. Please try again.');
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
      console.error('Unable to download timeline report:', error);
      window.alert('Unable to download the file. Please try again.');
    }
  }, [timelineFrom, timelineGrouping, timelineTo]);

  const downloadInterviewers = useCallback(async () => {
    try {
      await analyticsApi.downloadDataset('interviewers', {
        period: interviewerPeriod,
        interviewers: selectedInterviewers.length ? selectedInterviewers.join(',') : undefined,
        roles: selectedRoles.length ? selectedRoles.join(',') : undefined
      });
    } catch (error) {
      console.error('Unable to download interviewer report:', error);
      window.alert('Unable to download the file. Please try again.');
    }
  }, [interviewerPeriod, selectedInterviewers, selectedRoles]);

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
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={setSelectedInterviewers}
        selectedRoles={selectedRoles}
        onRoleChange={setSelectedRoles}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
        onDownload={downloadInterviewers}
      />

      <InterviewerGraphSection
        period={interviewerPeriod}
        onPeriodChange={setInterviewerPeriod}
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={setSelectedInterviewers}
        selectedRoles={selectedRoles}
        onRoleChange={setSelectedRoles}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
      />
    </div>
  );
};
