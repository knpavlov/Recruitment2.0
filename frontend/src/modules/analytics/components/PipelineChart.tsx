import { TimelineView, PipelineChartDataset } from '../types';
import styles from '../../../styles/AnalyticsScreen.module.css';
import { PeriodSelector } from './PeriodSelector';
import { ExportButton } from './ExportButton';
import { LineChart } from './LineChart';

interface PipelineChartProps {
  view: TimelineView;
  dataset: PipelineChartDataset;
  onChangeView: (view: TimelineView) => void;
}

const viewOptions = [
  { value: 'weekly' as TimelineView, label: 'Понедельно' },
  { value: 'monthly' as TimelineView, label: 'Помесячно' },
  { value: 'quarterly' as TimelineView, label: 'Поквартально' }
];

export const PipelineChart = ({ view, dataset, onChangeView }: PipelineChartProps) => (
  <section className={styles.panel}>
    <header className={styles.panelHeader}>
      <div>
        <h2 className={styles.panelTitle}>Воронка подбора</h2>
        <p className={styles.panelSubtitle}>
          Сравните объём резюме, интервью и итоговые решения, чтобы видеть узкие места процесса.
        </p>
      </div>
      <div className={styles.panelActions}>
        <PeriodSelector value={view} options={viewOptions} onChange={onChangeView} />
        <ExportButton filename="analytics-pipeline.csv" rows={dataset.exportRows}>
          Экспортировать
        </ExportButton>
      </div>
    </header>
    <LineChart labels={dataset.labels} series={dataset.series} />
  </section>
);
