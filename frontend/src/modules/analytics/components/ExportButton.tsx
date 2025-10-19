import { ReactNode } from 'react';
import { exportToCsv, ExportRow } from '../services/exportToCsv';
import styles from '../../../styles/AnalyticsScreen.module.css';

interface ExportButtonProps {
  filename: string;
  rows: ExportRow[];
  children: ReactNode;
}

export const ExportButton = ({ filename, rows, children }: ExportButtonProps) => {
  const handleClick = () => {
    // Экспортируем выбранный набор данных в CSV (Excel дружелюбный формат)
    exportToCsv(filename, rows);
  };

  return (
    <button type="button" className={styles.secondaryButton} onClick={handleClick} disabled={!rows.length}>
      {children}
    </button>
  );
};
