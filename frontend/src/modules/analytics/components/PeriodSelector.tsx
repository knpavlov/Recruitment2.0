import styles from '../../../styles/AnalyticsScreen.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface PeriodSelectorProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

export const PeriodSelector = <T extends string>({ value, options, onChange }: PeriodSelectorProps<T>) => (
  <div className={styles.segmentedControl}>
    {options.map((option) => (
      <button
        type="button"
        key={option.value}
        className={option.value === value ? styles.segmentedControlActive : styles.segmentedControlButton}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
