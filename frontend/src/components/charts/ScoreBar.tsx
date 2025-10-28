import type { FC } from 'react';
import styles from '../../styles/ScoreBar.module.css';

export type ScoreBarVariant = 'fit' | 'case';

interface ScoreBarProps {
  value: number | null;
  max?: number;
  variant?: ScoreBarVariant;
}

const formatScore = (value: number) => {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

export const ScoreBar: FC<ScoreBarProps> = ({ value, max = 5, variant = 'fit' }) => {
  if (value == null || Number.isNaN(value)) {
    return <span className={styles.empty}>—</span>;
  }

  const safeMax = max > 0 ? max : 5;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const width = safeMax ? Math.max((clamped / safeMax) * 100, clamped > 0 ? 8 : 0) : 0;
  const label = formatScore(clamped);
  const barClass = variant === 'case' ? styles.valueCase : styles.valueFit;

  return (
    <div className={styles.wrapper} aria-label={`Average score ${label} out of ${safeMax}`}>
      <div className={styles.track} role="presentation">
        <div className={`${styles.value} ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
};
