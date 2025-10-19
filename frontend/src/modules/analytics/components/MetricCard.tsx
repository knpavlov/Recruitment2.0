import styles from '../../../styles/AnalyticsScreen.module.css';
import { SummaryMetricCard } from '../types';

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const formatDelta = (value: number | null, previous: number | null) => {
  if (value === null || previous === null) {
    return { label: '—', trendClass: styles.deltaNeutral };
  }
  const diff = value - previous;
  if (Math.abs(diff) < 0.001) {
    return { label: '+0.0 п.п.', trendClass: styles.deltaNeutral };
  }
  const sign = diff > 0 ? '+' : '';
  return {
    label: `${sign}${(diff * 100).toFixed(1)} п.п.`,
    trendClass: diff > 0 ? styles.deltaPositive : styles.deltaNegative
  };
};

interface MetricCardProps {
  card: SummaryMetricCard;
}

export const MetricCard = ({ card }: MetricCardProps) => {
  const delta = formatDelta(card.value, card.previousValue);
  return (
    <article className={styles.metricCard}>
      <header className={styles.metricHeader}>
        <span className={styles.metricLabel}>{card.label}</span>
        <span className={`${styles.metricDelta} ${delta.trendClass}`}>{delta.label}</span>
      </header>
      <div className={styles.metricValue}>{formatPercent(card.value)}</div>
      <p className={styles.metricDescription}>{card.description}</p>
    </article>
  );
};
