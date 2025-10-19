import styles from '../../../styles/AnalyticsScreen.module.css';
import { PipelineSeries } from '../types';

interface LineChartProps {
  labels: string[];
  series: PipelineSeries[];
}

const COLORS = ['#4a6cf7', '#00a884', '#ff9f43', '#f25f5c', '#845ef7', '#1c7ed6', '#8c6dff'];

const TICK_COUNT = 4;

const buildPoints = (
  values: number[],
  length: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  maxValue: number
) => {
  if (maxValue <= 0) {
    return '';
  }
  const stepX = length > 1 ? width / (length - 1) : 0;
  return values
    .map((value, index) => {
      const x = offsetX + stepX * index;
      const y = offsetY + height - (value / maxValue) * height;
      return `${x},${y}`;
    })
    .join(' ');
};

const formatAxisValue = (value: number, axis: 'primary' | 'secondary') => {
  if (axis === 'secondary') {
    return `${value.toFixed(0)}%`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};

export const LineChart = ({ labels, series }: LineChartProps) => {
  if (!labels.length || !series.length) {
    return <div className={styles.emptyChart}>Нет данных для выбранного периода</div>;
  }

  const primarySeries = series.filter((item) => (item.axis ?? 'primary') === 'primary');
  const secondarySeries = series.filter((item) => item.axis === 'secondary');

  const primaryMax = Math.max(
    ...primarySeries.flatMap((item) => item.values),
    0
  );
  const secondaryMax = secondarySeries.length
    ? Math.max(...secondarySeries.flatMap((item) => item.values), 0)
    : 0;

  const chartWidth = 760;
  const chartHeight = 220;
  const marginLeft = 70;
  const marginRight = secondarySeries.length ? 70 : 28;
  const marginTop = 20;
  const marginBottom = 40;
  const svgWidth = marginLeft + chartWidth + marginRight;
  const svgHeight = marginTop + chartHeight + marginBottom;

  const axisY = Array.from({ length: TICK_COUNT + 1 }, (_, index) => index / TICK_COUNT);

  return (
    <div className={styles.chartContainer}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={styles.chartSvg}
        role="img"
        aria-label="Линейная диаграмма динамики воронки"
      >
        <g stroke="#e0e0e0" strokeWidth="1" fill="none">
          {axisY.map((fraction) => {
            const y = marginTop + chartHeight - fraction * chartHeight;
            return <line key={fraction} x1={marginLeft} x2={marginLeft + chartWidth} y1={y} y2={y} />;
          })}
        </g>

        {primarySeries.map((serie, index) => (
          <polyline
            key={serie.key}
            points={buildPoints(
              serie.values,
              labels.length,
              chartWidth,
              chartHeight,
              marginLeft,
              marginTop,
              primaryMax || 1
            )}
            fill="none"
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {secondarySeries.map((serie, idx) => (
          <polyline
            key={serie.key}
            points={buildPoints(
              serie.values,
              labels.length,
              chartWidth,
              chartHeight,
              marginLeft,
              marginTop,
              secondaryMax || 1
            )}
            fill="none"
            stroke={COLORS[(primarySeries.length + idx) % COLORS.length]}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {labels.map((label, index) => {
          const x =
            marginLeft + (labels.length > 1 ? (chartWidth / (labels.length - 1)) * index : chartWidth / 2);
          return (
            <text key={label} x={x} y={svgHeight - 12} className={styles.axisLabelBottom}>
              {label}
            </text>
          );
        })}

        {axisY.map((fraction) => {
          const y = marginTop + chartHeight - fraction * chartHeight;
          const primaryValue = primaryMax * fraction;
          return (
            <text
              key={`primary-${fraction}`}
              x={marginLeft - 12}
              y={y + 4}
              className={`${styles.axisLabel} ${styles.axisLabelLeft}`}
            >
              {formatAxisValue(primaryValue, 'primary')}
            </text>
          );
        })}

        {secondarySeries.length > 0 &&
          axisY.map((fraction) => {
            const y = marginTop + chartHeight - fraction * chartHeight;
            const value = secondaryMax * fraction;
            return (
              <text
                key={`secondary-${fraction}`}
                x={marginLeft + chartWidth + 40}
                y={y + 4}
                className={`${styles.axisLabel} ${styles.axisLabelRight}`}
              >
                {formatAxisValue(value, 'secondary')}
              </text>
            );
          })}
      </svg>
      <ul className={styles.chartLegend}>
        {series.map((item, index) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendMarker}
              style={{
                backgroundColor:
                  item.axis === 'secondary'
                    ? 'transparent'
                    : COLORS[index % COLORS.length],
                borderColor: COLORS[index % COLORS.length],
                borderStyle: item.axis === 'secondary' ? 'dashed' : 'solid'
              }}
            />
            <span className={styles.legendLabel}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
