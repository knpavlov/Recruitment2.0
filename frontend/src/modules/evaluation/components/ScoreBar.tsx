import styles from '../../../styles/ScoreBar.module.css';

interface ScoreBarProps {
  value: number | null;
  variant: 'case' | 'fit';
}

const MAX_SCORE = 5;

export const ScoreBar = ({ value, variant }: ScoreBarProps) => {
  if (value == null) {
    return <span className={styles.placeholder}>—</span>;
  }

  const safeValue = Math.min(Math.max(value, 0), MAX_SCORE);
  const width = (safeValue / MAX_SCORE) * 100;
  const barClass = variant === 'case' ? styles.caseFill : styles.fitFill;
  const label = `${variant === 'case' ? 'Case' : 'Fit'} average score ${safeValue.toFixed(2)}`;

  return (
    <div className={styles.wrapper} aria-label={label} role="group">
      <div className={styles.track} role="img">
        <div className={`${styles.fill} ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className={styles.value}>{safeValue.toFixed(2)}</span>
    </div>
  );
};
