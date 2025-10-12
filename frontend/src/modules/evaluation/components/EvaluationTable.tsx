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
  offerSummaryTooltip?: string;
  processStatus: 'draft' | 'in-progress' | 'completed';
  onStartProcess: () => void;
  startDisabled: boolean;
  startTooltip?: string;
  onEdit: () => void;
  onOpenStatus: () => void;
  offerActionDisabled: boolean;
  offerActionTooltip?: string;
  rejectActionDisabled: boolean;
  rejectActionTooltip?: string;
  advanceActionDisabled: boolean;
  advanceActionTooltip?: string;
  onOffer: () => void;
  onReject: () => void;
  onAdvance: () => void;
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

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'info'
  | 'danger'
  | 'success'
  | 'warning';

interface ActionButtonProps {
  label: string;
  variant: ButtonVariant;
  disabled?: boolean;
  tooltip?: string;
  onClick: () => void;
}

const ActionButton = ({ label, variant, disabled, tooltip, onClick }: ActionButtonProps) => {
  const baseClass = `${styles.actionButton} ${styles[`button${variant[0].toUpperCase()}${variant.slice(1)}`]}`;
  const className = disabled ? `${baseClass} ${styles.buttonDisabled}` : baseClass;
  const button = (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <div className={styles.tooltipWrapper} data-disabled={disabled ? 'true' : 'false'}>
      {button}
      <span className={styles.tooltip}>{tooltip}</span>
    </div>
  );
};

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
              <span className={styles.headerWithHint}>
                Offer votes
                <span className={styles.hintWrapper}>
                  <span className={styles.hintIcon}>?</span>
                  <span className={styles.hintTooltip}>
                    Yes, priority / Yes, meets high bar / Turndown, stay in contact / Turndown
                  </span>
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
                <td>
                  <span
                    className={row.offerSummaryTooltip ? styles.valueWithTooltip : undefined}
                    title={row.offerSummaryTooltip}
                  >
                    {row.offerSummary}
                  </span>
                </td>
                <td>{processLabel}</td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionsGroup}>
                    <ActionButton
                      label="Start process"
                      variant="primary"
                      disabled={row.startDisabled}
                      tooltip={row.startTooltip}
                      onClick={row.onStartProcess}
                    />
                    <ActionButton label="Edit" variant="secondary" onClick={row.onEdit} />
                    <ActionButton label="Status" variant="info" onClick={row.onOpenStatus} />
                  </div>
                  <div className={styles.actionsGroup}>
                    <ActionButton
                      label="Reject"
                      variant="danger"
                      disabled={row.rejectActionDisabled}
                      tooltip={row.rejectActionTooltip}
                      onClick={row.onReject}
                    />
                    <ActionButton
                      label="Offer"
                      variant="success"
                      disabled={row.offerActionDisabled}
                      tooltip={row.offerActionTooltip}
                      onClick={row.onOffer}
                    />
                    <ActionButton
                      label="Progress to next round"
                      variant="warning"
                      disabled={row.advanceActionDisabled}
                      tooltip={row.advanceActionTooltip}
                      onClick={row.onAdvance}
                    />
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
