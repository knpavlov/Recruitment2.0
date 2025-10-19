import { SummaryMetric, SummaryPeriod } from '../types';
import styles from '../../../styles/AnalyticsScreen.module.css';

const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  'rolling-3': 'Скользящая 3M',
  'fy-to-date': 'C начала ФГ',
  'rolling-12': 'Скользящая 12M'
};

interface SummaryCardsProps {
  metrics: SummaryMetric[];
  activePeriod: SummaryPeriod;
  onPeriodChange: (period: SummaryPeriod) => void;
  onExport: () => void;
}

export const SummaryCards = ({ metrics, activePeriod, onPeriodChange, onExport }: SummaryCardsProps) => {
  return (
    <section className={styles.summarySection}>
      <div className={styles.summaryControls}>
        <div className={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as SummaryPeriod[]).map((period) => (
            <button
              key={period}
              type="button"
              className={`${styles.periodButton} ${period === activePeriod ? styles.periodButtonActive : ''}`}
              onClick={() => onPeriodChange(period)}
            >
              {PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
        <button type="button" className={styles.exportButton} onClick={onExport}>
          Экспорт сводки
        </button>
      </div>
      <div className={styles.summaryCards}>
        {metrics.map((metric) => (
          <article key={metric.id} className={styles.summaryCard}>
            <p className={styles.summaryLabel}>{metric.label}</p>
            <div className={styles.summaryValue}>
              {metric.value === null ? '—' : `${metric.value.toFixed(1)}%`}
            </div>
            <span className={styles.summaryTrend}>{metric.trendLabel}</span>
          </article>
        ))}
      </div>
    </section>
  );
};
