import { ChangeEvent } from 'react';
import { AnalyticsSummaryPeriod, AnalyticsSummaryResponse } from '../../../shared/types/analytics';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { formatPercentage, formatInteger } from '../utils/format';
import { ExportButton } from './ExportButton';

interface SummarySectionProps {
  period: AnalyticsSummaryPeriod;
  onChangePeriod: (period: AnalyticsSummaryPeriod) => void;
  data: AnalyticsSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  onExport: () => Promise<void>;
}

const PERIOD_OPTIONS: { value: AnalyticsSummaryPeriod; label: string }[] = [
  { value: 'rolling-3-month', label: 'Скользящее среднее (3 месяца)' },
  { value: 'fiscal-year-to-date', label: 'С начала фин. года' },
  { value: 'rolling-12-month', label: 'Скользящее среднее (12 месяцев)' }
];

export const SummarySection = ({
  period,
  onChangePeriod,
  data,
  isLoading,
  error,
  onExport
}: SummarySectionProps) => {
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangePeriod(event.target.value as AnalyticsSummaryPeriod);
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Ключевые метрики</h2>
          <p className={styles.subtitle}>Мониторинг гендерного баланса и динамики офферов.</p>
        </div>
        <div className={styles.controls}>
          <label>
            Период
            <select value={period} onChange={handleSelectChange}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ExportButton label="Скачать" onExport={onExport} />
        </div>
      </div>
      {isLoading && <p className={styles.loading}>Загрузка метрик…</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      {data && !isLoading && !error && (
        <div className={styles.cardsGrid}>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>Доля женщин</h3>
            <span className={styles.cardValue}>{formatPercentage(data.metrics.femaleShare.value)}</span>
            <span className={styles.cardHint}>
              {formatInteger(data.metrics.femaleShare.numerator)} из {formatInteger(data.metrics.femaleShare.denominator)}
            </span>
          </article>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>Доля принятых офферов</h3>
            <span className={styles.cardValue}>
              {formatPercentage(data.metrics.offerAcceptanceRate.value)}
            </span>
            <span className={styles.cardHint}>
              {formatInteger(data.metrics.offerAcceptanceRate.numerator)} из{' '}
              {formatInteger(data.metrics.offerAcceptanceRate.denominator)}
            </span>
          </article>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>Offer rate</h3>
            <span className={styles.cardValue}>{formatPercentage(data.metrics.offerRate.value)}</span>
            <span className={styles.cardHint}>
              {formatInteger(data.metrics.offerRate.numerator)} из {formatInteger(data.metrics.offerRate.denominator)}
            </span>
          </article>
        </div>
      )}
    </section>
  );
};
