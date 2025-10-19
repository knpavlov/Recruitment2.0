import { useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';

interface ExportButtonProps {
  label: string;
  onExport: () => Promise<void>;
}

export const ExportButton = ({ label, onExport }: ExportButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleClick = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      await onExport();
    } catch (error) {
      console.error('Не удалось экспортировать набор данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.downloadButton}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Подготовка…' : label}
    </button>
  );
};
