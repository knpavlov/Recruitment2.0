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

const FISCAL_YEAR_START_MONTH = 4; // April
const GRAPH_DEFAULT_PERIOD: InterviewerPeriod = 'rolling_12';

const toDateInput = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${value.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonthUtc = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const addMonthsUtc = (value: Date, months: number) => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  date.setUTCMonth(date.getUTCMonth() + months, 1);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const originalDay = value.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const safeDay = Math.min(originalDay, lastDay);
  return new Date(Date.UTC(year, month, safeDay));
};

const deriveInterviewerRange = (period: InterviewerPeriod): { from: string; to: string } => {
  const reference = new Date();
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  let start: Date;

  switch (period) {
    case 'last_month': {
      const previousMonth = addMonthsUtc(end, -1);
      start = startOfMonthUtc(previousMonth);
      break;
    }
    case 'rolling_12':
      start = startOfMonthUtc(addMonthsUtc(end, -11));
      break;
    case 'fytd': {
      const fiscalStartMonthIndex = FISCAL_YEAR_START_MONTH - 1;
      let fiscalYear = end.getUTCFullYear();
      if (end.getUTCMonth() < fiscalStartMonthIndex) {
        fiscalYear -= 1;
      }
      start = new Date(Date.UTC(fiscalYear, fiscalStartMonthIndex, 1));
      break;
    }
    case 'rolling_3':
    default:
      start = startOfMonthUtc(addMonthsUtc(end, -2));
      break;
  }

  return { from: toDateInput(start), to: toDateInput(end) };
};

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerPeriod, setInterviewerPeriod] = useState<InterviewerPeriod>('last_month');
  const [interviewerGraphGrouping, setInterviewerGraphGrouping] = useState<TimelineGrouping>('month');
  const initialGraphRange = deriveInterviewerRange(GRAPH_DEFAULT_PERIOD);
  const [interviewerGraphFrom, setInterviewerGraphFrom] = useState<string | undefined>(initialGraphRange.from);
  const [interviewerGraphTo, setInterviewerGraphTo] = useState<string | undefined>(initialGraphRange.to);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<InterviewerSeniority[]>([]);

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerInsightsState = useAnalyticsInterviewers(interviewerPeriod, {
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined,
    roles: selectedRoles.length ? selectedRoles : undefined
  });
  const interviewerGraphState = useAnalyticsInterviewers(GRAPH_DEFAULT_PERIOD, {
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined,
    roles: selectedRoles.length ? selectedRoles : undefined,
    groupBy: interviewerGraphGrouping,
    from: interviewerGraphFrom,
    to: interviewerGraphTo
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
        data={interviewerInsightsState.data}
        loading={interviewerInsightsState.loading}
        error={interviewerInsightsState.error}
        onDownload={downloadInterviewers}
      />

      <InterviewerGraphSection
        grouping={interviewerGraphGrouping}
        onGroupingChange={setInterviewerGraphGrouping}
        from={interviewerGraphFrom}
        to={interviewerGraphTo}
        onFromChange={setInterviewerGraphFrom}
        onToChange={setInterviewerGraphTo}
        selectedInterviewers={selectedInterviewers}
        onInterviewerChange={setSelectedInterviewers}
        selectedRoles={selectedRoles}
        onRoleChange={setSelectedRoles}
        data={interviewerGraphState.data}
        loading={interviewerGraphState.loading}
        error={interviewerGraphState.error}
      />
    </div>
  );
};
