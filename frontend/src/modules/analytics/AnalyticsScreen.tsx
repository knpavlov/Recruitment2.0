import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AnalyticsScreen.module.css';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import {
  buildInterviewerExportRows,
  buildInterviewerSummaries,
  buildPipelineDataset,
  buildSummaryMetrics
} from './services/analyticsCalculations';
import { SummaryPeriod, TimelineView } from './types';
import { SummaryMetricsPanel } from './components/SummaryMetricsPanel';
import { PipelineChart } from './components/PipelineChart';
import { InterviewerAnalyticsPanel } from './components/InterviewerAnalyticsPanel';

export const AnalyticsScreen = () => {
  const { timeline, interviewers, financialYearStartMonth } = useAnalyticsData();
  const interviewerOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; email: string }>();
    for (const entry of interviewers) {
      if (!unique.has(entry.interviewerId)) {
        unique.set(entry.interviewerId, {
          id: entry.interviewerId,
          name: entry.interviewerName,
          email: entry.interviewerEmail
        });
      }
    }
    return Array.from(unique.values());
  }, [interviewers]);

  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('rolling-quarter');
  const [timelineView, setTimelineView] = useState<TimelineView>('monthly');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>(() =>
    interviewerOptions.map((option) => option.id)
  );

  useEffect(() => {
    setSelectedInterviewers((prev) => {
      const availableIds = interviewerOptions.map((option) => option.id);
      if (!prev.length) {
        return availableIds;
      }
      return prev.filter((id) => availableIds.includes(id));
    });
  }, [interviewerOptions]);

  const summary = useMemo(
    () => buildSummaryMetrics(timeline, summaryPeriod, financialYearStartMonth),
    [timeline, summaryPeriod, financialYearStartMonth]
  );

  const pipeline = useMemo(
    () => buildPipelineDataset(timeline, timelineView),
    [timeline, timelineView]
  );

  const interviewerSummaries = useMemo(
    () => buildInterviewerSummaries(interviewers, selectedInterviewers),
    [interviewers, selectedInterviewers]
  );

  const interviewerExportRows = useMemo(
    () => buildInterviewerExportRows(interviewerSummaries),
    [interviewerSummaries]
  );

  const handleToggleInterviewer = (id: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedInterviewers(interviewerOptions.map((option) => option.id));
  };

  const handleResetSelection = () => {
    setSelectedInterviewers([]);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.pageHeader}>
        <h1>Analytics</h1>
        <p className={styles.pageSubtitle}>
          Получайте структурированную картину воронки найма и эффективности интервьюеров.
        </p>
      </header>

      <SummaryMetricsPanel
        period={summaryPeriod}
        cards={summary.cards}
        exportRows={summary.exportRows}
        onChangePeriod={setSummaryPeriod}
      />

      <PipelineChart view={timelineView} dataset={pipeline} onChangeView={setTimelineView} />

      <InterviewerAnalyticsPanel
        options={interviewerOptions.map((option) => ({ id: option.id, name: option.name }))}
        selectedIds={selectedInterviewers}
        summaries={interviewerSummaries}
        exportRows={interviewerExportRows}
        onToggle={handleToggleInterviewer}
        onSelectAll={handleSelectAll}
        onReset={handleResetSelection}
      />
    </div>
  );
};
