import { useMemo, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';

interface LineSeries {
  key: string;
  label: string;
  color: string;
  formatter?: (value: number) => string;
}

interface LineChartPoint {
  label: string;
  values: Record<string, number | null | undefined>;
}

interface SimpleLineChartProps {
  series: LineSeries[];
  points: LineChartPoint[];
}

const WIDTH = 800;
const HEIGHT = 320;
const MARGINS = { top: 20, right: 20, bottom: 48, left: 70 };

export const SimpleLineChart = ({ series, points }: SimpleLineChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const numericBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    points.forEach((point) => {
      series.forEach((item) => {
        const raw = point.values[item.key];
        if (raw == null) {
          return;
        }
        if (raw < min) {
          min = raw;
        }
        if (raw > max) {
          max = raw;
        }
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1 };
    }
    if (min === max) {
      const padding = Math.abs(min) * 0.1 || 1;
      return { min: min - padding, max: max + padding };
    }
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [points, series]);

  const chartWidth = WIDTH - MARGINS.left - MARGINS.right;
  const chartHeight = HEIGHT - MARGINS.top - MARGINS.bottom;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const yScale = (value: number) => {
    if (numericBounds.max === numericBounds.min) {
      return MARGINS.top + chartHeight / 2;
    }
    const ratio = (value - numericBounds.min) / (numericBounds.max - numericBounds.min);
    return MARGINS.top + chartHeight - ratio * chartHeight;
  };

  const xScale = (index: number) => MARGINS.left + stepX * index;

  const paths = useMemo(() => {
    return series.map((item) => {
      const path = points
        .map((point, index) => {
          const value = point.values[item.key];
          if (value == null) {
            return null;
          }
          const x = xScale(index);
          const y = yScale(value);
          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .filter((segment): segment is string => segment !== null)
        .join(' ');
      return { key: item.key, color: item.color, path };
    });
  }, [points, series]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const levels = 5;
    for (let i = 0; i <= levels; i += 1) {
      const ratio = i / levels;
      const value = numericBounds.min + ratio * (numericBounds.max - numericBounds.min);
      ticks.push(value);
    }
    return ticks;
  }, [numericBounds]);

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className={styles.chartInner}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%">
        <line
          x1={MARGINS.left}
          y1={MARGINS.top + chartHeight}
          x2={MARGINS.left + chartWidth}
          y2={MARGINS.top + chartHeight}
          stroke="rgba(148, 163, 184, 0.6)"
        />
        <line
          x1={MARGINS.left}
          y1={MARGINS.top}
          x2={MARGINS.left}
          y2={MARGINS.top + chartHeight}
          stroke="rgba(148, 163, 184, 0.6)"
        />
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={MARGINS.left}
                y1={y}
                x2={MARGINS.left + chartWidth}
                y2={y}
                stroke="rgba(148, 163, 184, 0.2)"
              />
              <text x={MARGINS.left - 8} y={y + 4} textAnchor="end" fontSize={12} fill="#64748b">
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => (
          <text
            key={`x-${index}`}
            x={xScale(index)}
            y={MARGINS.top + chartHeight + 24}
            textAnchor="middle"
            fontSize={12}
            fill="#64748b"
          >
            {point.label}
          </text>
        ))}
        {paths.map((item) => (
          <path key={item.key} d={item.path} fill="none" stroke={item.color} strokeWidth={2} />
        ))}
        {series.map((item) =>
          points.map((point, index) => {
            const value = point.values[item.key];
            if (value == null) {
              return null;
            }
            const x = xScale(index);
            const y = yScale(value);
            return <circle key={`${item.key}-${index}`} cx={x} cy={y} r={3} fill={item.color} />;
          })
        )}
        {points.map((_, index) => {
          const x = xScale(index);
          const width = index === 0 || points.length === 1 ? stepX / 2 : stepX;
          return (
            <rect
              key={`hover-${index}`}
              x={x - width / 2}
              y={MARGINS.top}
              width={width}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          );
        })}
      </svg>
      {hoverPoint && (
        <div
          className={styles.chartTooltip}
          style={{
            left: `${((xScale(hoverIndex!) - MARGINS.left) / chartWidth) * 100}%`,
            top: `${((yScale(numericBounds.max) - MARGINS.top) / chartHeight) * 100}%`
          }}
        >
          <strong>{hoverPoint.label}</strong>
          {series.map((item) => {
            const value = hoverPoint.values[item.key];
            if (value == null) {
              return null;
            }
            const formatted = item.formatter ? item.formatter(value) : value.toFixed(2);
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.color
                  }}
                />
                <span>
                  {item.label}: {formatted}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
