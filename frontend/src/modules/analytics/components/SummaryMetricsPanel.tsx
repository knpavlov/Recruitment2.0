import { SummaryMetricCard, SummaryPeriod, SummaryMetricExportRow } from '../types';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { MetricCard } from './MetricCard';
import { PeriodSelector } from './PeriodSelector';
import { ExportButton } from './ExportButton';

interface SummaryMetricsPanelProps {
  period: SummaryPeriod;
  cards: SummaryMetricCard[];
  exportRows: SummaryMetricExportRow[];
  onChangePeriod: (period: SummaryPeriod) => void;
}

const periodOptions = [
  { value: 'rolling-quarter' as SummaryPeriod, label: '3 месяца (скользяще)' },
  { value: 'financial-year' as SummaryPeriod, label: 'С начала фин. года' },
  { value: 'rolling-year' as SummaryPeriod, label: '12 месяцев (скользяще)' }
];

export const SummaryMetricsPanel = ({ period, cards, exportRows, onChangePeriod }: SummaryMetricsPanelProps) => (
  <section className={styles.panel}>
    <header className={styles.panelHeader}>
      <div>
        <h2 className={styles.panelTitle}>Ключевые показатели</h2>
        <p className={styles.panelSubtitle}>
          Оцените динамику женского представительства и эффективности предложения офферов.
        </p>
      </div>
      <div className={styles.panelActions}>
        <PeriodSelector value={period} options={periodOptions} onChange={onChangePeriod} />
        <ExportButton filename="analytics-summary.csv" rows={exportRows}>
          Экспортировать
        </ExportButton>
      </div>
    </header>
    <div className={styles.metricGrid}>
      {cards.map((card) => (
        <MetricCard key={card.key} card={card} />
      ))}
    </div>
  </section>
);
