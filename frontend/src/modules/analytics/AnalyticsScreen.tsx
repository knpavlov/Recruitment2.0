import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { SummarySection } from './components/SummarySection';
import { TimelineSection } from './components/TimelineSection';
import { InterviewerSection } from './components/InterviewerSection';
import { InterviewerGraphSection } from './components/InterviewerGraphSection';
import { useAnalyticsSummary } from './hooks/useAnalyticsSummary';
import { useAnalyticsTimeline } from './hooks/useAnalyticsTimeline';
import { useAnalyticsInterviewers } from './hooks/useAnalyticsInterviewers';
import { analyticsApi } from './services/analyticsApi';
import type {
  InterviewerPeriod,
  InterviewerSeniority,
  SummaryPeriod,
  TimelineGrouping
} from './types/analytics';

export const AnalyticsScreen = () => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling_3');
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>('month');
  const [timelineFrom, setTimelineFrom] = useState<string | undefined>(undefined);
  const [timelineTo, setTimelineTo] = useState<string | undefined>(undefined);
  const [interviewerPeriod, setInterviewerPeriod] = useState<InterviewerPeriod>('last_month');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [manualInterviewers, setManualInterviewers] = useState<string[]>([]);
  const [roleShortcuts, setRoleShortcuts] = useState<InterviewerSeniority[]>([]);
  const [excludedInterviewers, setExcludedInterviewers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<InterviewerSeniority[]>([]);

  const summaryState = useAnalyticsSummary(summaryPeriod);
  const timelineState = useAnalyticsTimeline(timelineGrouping, { from: timelineFrom, to: timelineTo });
  const interviewerState = useAnalyticsInterviewers(interviewerPeriod, {
    interviewerIds: selectedInterviewers.length ? selectedInterviewers : undefined,
    roles: selectedRoles.length ? selectedRoles : undefined
  });

  const availableInterviewers = interviewerState.data?.interviewers ?? [];

  const normalizeList = (values: string[]) => values.map((value) => value.toLowerCase());

  const uniqueMerge = (primary: string[], secondary: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of primary) {
      const normalized = id.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(id);
      }
    }
    for (const id of secondary) {
      const normalized = id.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(id);
      }
    }
    return result;
  };

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false;
    }
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) {
        return false;
      }
    }
    return true;
  };

  const autoInterviewers = useMemo(() => {
    if (!roleShortcuts.length) {
      return [] as string[];
    }
    const excludedSet = new Set(normalizeList(excludedInterviewers));
    const activeRoles = new Set(roleShortcuts);
    const collected: string[] = [];
    for (const interviewer of availableInterviewers) {
      if (!interviewer.role || !activeRoles.has(interviewer.role)) {
        continue;
      }
      const normalized = interviewer.id.toLowerCase();
      if (excludedSet.has(normalized)) {
        continue;
      }
      collected.push(interviewer.id);
    }
    return collected;
  }, [availableInterviewers, excludedInterviewers, roleShortcuts]);

  const mergedInterviewers = useMemo(
    () => uniqueMerge(manualInterviewers, autoInterviewers),
    [autoInterviewers, manualInterviewers]
  );

  const pruneList = (values: string[], allowed: Set<string>) =>
    values.filter((value) => allowed.has(value.toLowerCase()));

  useEffect(() => {
    const allowed = new Set(availableInterviewers.map((descriptor) => descriptor.id.toLowerCase()));
    setManualInterviewers((current) => {
      const next = pruneList(current, allowed);
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
    setExcludedInterviewers((current) => {
      const next = pruneList(current, allowed);
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
  }, [availableInterviewers]);

  useEffect(() => {
    if (!roleShortcuts.length) {
      if (excludedInterviewers.length) {
        setExcludedInterviewers([]);
      }
      return;
    }
    const activeRoles = new Set(roleShortcuts);
    const allowed = new Set(
      availableInterviewers
        .filter((descriptor) => descriptor.role && activeRoles.has(descriptor.role))
        .map((descriptor) => descriptor.id.toLowerCase())
    );
    setExcludedInterviewers((current) => {
      const next = pruneList(current, allowed);
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
  }, [availableInterviewers, excludedInterviewers.length, roleShortcuts]);

  useEffect(() => {
    setSelectedInterviewers((current) => {
      if (arraysEqual(current, mergedInterviewers)) {
        return current;
      }
      return mergedInterviewers;
    });
  }, [mergedInterviewers]);

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
        manualInterviewers={manualInterviewers}
        onManualInterviewersChange={setManualInterviewers}
        roleShortcuts={roleShortcuts}
        onRoleShortcutsChange={setRoleShortcuts}
        excludedInterviewers={excludedInterviewers}
        onExcludedInterviewersChange={setExcludedInterviewers}
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
        manualInterviewers={manualInterviewers}
        onManualInterviewersChange={setManualInterviewers}
        roleShortcuts={roleShortcuts}
        onRoleShortcutsChange={setRoleShortcuts}
        excludedInterviewers={excludedInterviewers}
        onExcludedInterviewersChange={setExcludedInterviewers}
        selectedRoles={selectedRoles}
        onRoleChange={setSelectedRoles}
        data={interviewerState.data}
        loading={interviewerState.loading}
        error={interviewerState.error}
      />
    </div>
  );
};
