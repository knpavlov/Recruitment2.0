import styles from '../../../styles/AnalyticsScreen.module.css';

export interface InterviewerOption {
  id: string;
  name: string;
}

interface InterviewerFilterProps {
  options: InterviewerOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
}

export const InterviewerFilter = ({ options, selected, onToggle, onSelectAll, onReset }: InterviewerFilterProps) => (
  <div className={styles.filterBlock}>
    <div className={styles.filterHeader}>
      <h3 className={styles.filterTitle}>Интервьюеры</h3>
      <div className={styles.filterActions}>
        <button type="button" className={styles.textButton} onClick={onSelectAll}>
          Выбрать всех
        </button>
        <button type="button" className={styles.textButton} onClick={onReset}>
          Сбросить
        </button>
      </div>
    </div>
    <ul className={styles.filterList}>
      {options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <li key={option.id}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.id)}
                className={styles.checkbox}
              />
              <span>{option.name}</span>
            </label>
          </li>
        );
      })}
    </ul>
  </div>
);
