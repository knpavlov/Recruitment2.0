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
  startTooltip: string | null;
  onEdit: () => void;
  onOpenStatus: () => void;
  onReject: () => void;
  onOffer: () => void;
  onProgress: () => void;
  decisionDisabled: boolean;
  decisionTooltip: string | null;
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
              <span className={styles.tooltipAnchor}>
                Offer votes
                <span className={styles.tooltipBadge}>i</span>
                <span className={styles.tooltipContent}>
                  Yes, priority / Yes, meets high bar / Turndown, stay in contact / Turndown
                </span>
              </span>
            </th>
            <th>Process</th>
            <th className={styles.actionsHeader}>Workflow</th>
            <th className={styles.decisionsHeader}>Decisions</th>
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
                  <div className={styles.buttonWithTooltip} data-tooltip={row.startTooltip ?? undefined}>
                    <button
                      type="button"
                      className={styles.actionPrimaryButton}
                      onClick={row.onStartProcess}
                      disabled={row.startDisabled}
                    >
                      Start process
                    </button>
                  </div>
                  <button type="button" className={styles.actionSecondaryButton} onClick={row.onEdit}>
                    Edit
                  </button>
                  <button type="button" className={styles.actionInfoButton} onClick={row.onOpenStatus}>
                    Status
                  </button>
                </td>
                <td className={styles.decisionsCell}>
                  <div className={styles.buttonWithTooltip} data-tooltip={row.decisionTooltip ?? undefined}>
                    <button
                      type="button"
                      className={styles.decisionPositiveButton}
                      onClick={row.onOffer}
                      disabled={row.decisionDisabled}
                    >
                      Offer
                    </button>
                  </div>
                  <div className={styles.buttonWithTooltip} data-tooltip={row.decisionTooltip ?? undefined}>
                    <button
                      type="button"
                      className={styles.decisionProgressButton}
                      onClick={row.onProgress}
                      disabled={row.decisionDisabled}
                    >
                      Progress to next round
                    </button>
                  </div>
                  <div className={styles.buttonWithTooltip} data-tooltip={row.decisionTooltip ?? undefined}>
                    <button
                      type="button"
                      className={styles.decisionNegativeButton}
                      onClick={row.onReject}
                      disabled={row.decisionDisabled}
                    >
                      Reject
                    </button>
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
