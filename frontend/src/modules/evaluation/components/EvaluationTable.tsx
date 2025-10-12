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
  startTooltip?: string;
  decisionDisabled: boolean;
  decisionTooltip?: string;
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
            <th>
              <span className={styles.columnHeaderWithTooltip}>
                Offer votes
                <span
                  className={styles.tooltipTrigger}
                  data-tooltip="Yes, priority / Yes, meets high bar / Turndown, stay in contact / Turndown"
                >
                  ⓘ
                </span>
              </span>
            </th>
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
                  <div className={styles.actionGroups}>
                    <div className={styles.actionGroupPrimary}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.neutralButton}`}
                        onClick={row.onStartProcess}
                        disabled={row.startDisabled}
                        data-tooltip={row.startDisabled ? row.startTooltip : undefined}
                      >
                        Start process
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.neutralButton}`}
                        onClick={row.onEdit}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.neutralButton}`}
                        onClick={row.onOpenStatus}
                      >
                        Status
                      </button>
                    </div>
                    <div className={styles.actionGroupSecondary}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.offerButton}`}
                        disabled={row.decisionDisabled}
                        data-tooltip={row.decisionDisabled ? row.decisionTooltip : undefined}
                        onClick={() => {}}
                      >
                        Offer
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.progressButton}`}
                        disabled={row.decisionDisabled}
                        data-tooltip={row.decisionDisabled ? row.decisionTooltip : undefined}
                        onClick={() => {}}
                      >
                        Progress to next round
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.rejectButton}`}
                        disabled={row.decisionDisabled}
                        data-tooltip={row.decisionDisabled ? row.decisionTooltip : undefined}
                        onClick={() => {}}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
