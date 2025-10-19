import styles from '../../../styles/AnalyticsScreen.module.css';
import { InterviewerSummary } from '../types';
import { ExportRow } from '../services/exportToCsv';
import { InterviewerFilter, InterviewerOption } from './InterviewerFilter';
import { InterviewerStatsTable } from './InterviewerStatsTable';
import { ExportButton } from './ExportButton';

interface InterviewerAnalyticsPanelProps {
  options: InterviewerOption[];
  selectedIds: string[];
  summaries: InterviewerSummary[];
  exportRows: ExportRow[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
}

export const InterviewerAnalyticsPanel = ({
  options,
  selectedIds,
  summaries,
  exportRows,
  onToggle,
  onSelectAll,
  onReset
}: InterviewerAnalyticsPanelProps) => (
  <section className={styles.panel}>
    <header className={styles.panelHeader}>
      <div>
        <h2 className={styles.panelTitle}>Статистика интервьюеров</h2>
        <p className={styles.panelSubtitle}>
          Следите за нагрузкой и качеством оценки по каждому интервьюеру за неделю, месяц и квартал.
        </p>
      </div>
      <div className={styles.panelActions}>
        <ExportButton filename="analytics-interviewers.csv" rows={exportRows}>
          Экспортировать
        </ExportButton>
      </div>
    </header>
    <div className={styles.interviewerSection}>
      <InterviewerFilter
        options={options}
        selected={selectedIds}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        onReset={onReset}
      />
      <InterviewerStatsTable summaries={summaries} />
    </div>
  </section>
);
