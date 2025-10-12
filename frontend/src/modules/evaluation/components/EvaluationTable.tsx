import styles from '../../../styles/EvaluationScreen.module.css';

export interface EvaluationTableRow {
  id: string;
  candidateName: string;
  candidatePosition: string;
  roundNumber: number | null;
  formsCompleted: number;
  formsPlanned: number;
  avgFitScore: number | null;
  avgCaseScore: number | null;
  offerSummary: string;
  processStatus: 'draft' | 'in-progress' | 'completed';
  onStartProcess: () => void;
  startDisabled: boolean;
  onEdit: () => void;
  onOpenStatus: () => void;
}

export interface EvaluationTableProps {
  rows: EvaluationTableRow[];
  sortKey: 'name' | 'position' | 'round' | 'avgFit' | 'avgCase';
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: 'name' | 'position' | 'round' | 'avgFit' | 'avgCase') => void;
}

const SORTABLE_COLUMNS: Array<{
  key: 'name' | 'position' | 'round' | 'avgFit' | 'avgCase';
  title: string;
}> = [
  { key: 'name', title: 'Candidate' },
  { key: 'position', title: 'Position' },
  { key: 'round', title: 'Round' },
  { key: 'avgFit', title: 'Avg fit score' },
  { key: 'avgCase', title: 'Avg case score' }
];

const getSortLabel = (direction: 'asc' | 'desc') => (direction === 'asc' ? '▲' : '▼');

export const EvaluationTable = ({ rows, sortDirection, sortKey, onSortChange }: EvaluationTableProps) => {
  if (rows.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.emptyState}>
          <h2>No evaluations yet</h2>
          <p>Create your first evaluation to assign interviewers and cases.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map((column) => {
              const isActive = sortKey === column.key;
              return (
                <th key={column.key}>
                  <button
                    type="button"
                    className={`${styles.sortButton} ${isActive ? styles.sortButtonActive : ''}`}
                    onClick={() => onSortChange(column.key)}
                  >
                    {column.title}
                    {isActive && <span className={styles.sortIcon}>{getSortLabel(sortDirection)}</span>}
                  </button>
                </th>
              );
            })}
            <th>Forms</th>
            <th>Offer votes (priority / strong / warm / no)</th>
            <th>Process</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const roundLabel = row.roundNumber != null ? `Round ${row.roundNumber}` : '—';
            const formsLabel = `${row.formsCompleted}/${row.formsPlanned}`;
            const avgFitLabel = row.avgFitScore != null ? row.avgFitScore.toFixed(1) : '—';
            const avgCaseLabel = row.avgCaseScore != null ? row.avgCaseScore.toFixed(1) : '—';
            const processLabel =
              row.processStatus === 'in-progress'
                ? 'In progress'
                : row.processStatus === 'completed'
                  ? 'Completed'
                  : 'Draft';
            return (
              <tr key={row.id}>
                <td>{row.candidateName}</td>
                <td>{row.candidatePosition}</td>
                <td>{roundLabel}</td>
                <td>{avgFitLabel}</td>
                <td>{avgCaseLabel}</td>
                <td>{formsLabel}</td>
                <td>{row.offerSummary}</td>
                <td>{processLabel}</td>
                <td className={styles.actionsCell}>
                  <button
                    className={styles.tablePrimaryButton}
                    onClick={row.onStartProcess}
                    disabled={row.startDisabled}
                  >
                    Start process
                  </button>
                  <button className={styles.tableSecondaryButton} onClick={row.onEdit}>
                    Edit
                  </button>
                  <button className={styles.tablePrimaryButton} onClick={row.onOpenStatus}>
                    Status
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
