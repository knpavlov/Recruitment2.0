import { ChangeEvent, useState } from 'react';
import styles from '../../../styles/EvaluationScreen.module.css';

type DecisionOption = 'offer' | 'progress' | 'reject';

type SortableColumnKey = 'name' | 'position' | 'created' | 'round' | 'avgFit' | 'avgCase';

export interface EvaluationTableRow {
  id: string;
  candidateName: string;
  candidatePosition: string;
  createdAt: string | null;
  createdOn: string;
  roundOptions: Array<{ value: number; label: string }>;
  selectedRound: number;
  roundNumber: number;
  onRoundChange: (round: number) => void;
  isHistoricalView: boolean;
  formsCompleted: number;
  formsPlanned: number;
  avgFitScore: number | null;
  avgCaseScore: number | null;
  offerSummary: string;
  processLabel: string;
  invitesButtonLabel: string;
  invitesDisabled: boolean;
  invitesTooltip?: string;
  invitesMenuAvailable: boolean;
  onSendInvitesAll: () => void;
  onSendInvitesUpdated: () => void;
  onEdit: () => void;
  onOpenStatus: () => void;
  decisionDisabled: boolean;
  decisionTooltip?: string;
  decisionLabel: string;
  decisionSelection: DecisionOption | null;
  onDecisionSelect: (option: DecisionOption) => void;
}

export interface EvaluationTableProps {
  rows: EvaluationTableRow[];
  sortKey: SortableColumnKey;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: SortableColumnKey) => void;
}

const SORTABLE_COLUMNS: Array<{ key: SortableColumnKey; title: string }> = [
  { key: 'name', title: 'Candidate' },
  { key: 'position', title: 'Position' },
  { key: 'created', title: 'Created on' },
  { key: 'round', title: 'Round' },
  { key: 'avgFit', title: 'Avg fit score' },
  { key: 'avgCase', title: 'Avg case score' }
];

const getSortLabel = (direction: 'asc' | 'desc') => (direction === 'asc' ? '▲' : '▼');

const DECISION_OPTIONS: Array<{ option: DecisionOption; label: string }> = [
  { option: 'offer', label: 'Offer' },
  { option: 'progress', label: 'Progress to next round' },
  { option: 'reject', label: 'Reject' }
];

export const EvaluationTable = ({ rows, sortDirection, sortKey, onSortChange }: EvaluationTableProps) => {
  const [openDecisionId, setOpenDecisionId] = useState<string | null>(null);
  const [openInvitesId, setOpenInvitesId] = useState<string | null>(null);

  const resolveDecisionToneClass = (selection: DecisionOption | null) => {
    if (selection === 'offer') {
      return styles.decisionButtonOffer;
    }
    if (selection === 'reject') {
      return styles.decisionButtonReject;
    }
    if (selection === 'progress') {
      return styles.decisionButtonProgress;
    }
    return '';
  };

  const closeMenus = () => {
    setOpenDecisionId(null);
    setOpenInvitesId(null);
  };

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
            const formsLabel = `${row.formsCompleted}/${row.formsPlanned}`;
            const avgFitLabel = row.avgFitScore != null ? row.avgFitScore.toFixed(1) : '—';
            const avgCaseLabel = row.avgCaseScore != null ? row.avgCaseScore.toFixed(1) : '—';
            const selectedRoundOption = row.roundOptions.find((option) => option.value === row.selectedRound);
            const roundLabel = selectedRoundOption?.label ?? `Round ${row.selectedRound}`;
            const isInvitesMenuOpen = openInvitesId === row.id;
            const isDecisionMenuOpen = openDecisionId === row.id;

            const handleRoundChange = (event: ChangeEvent<HTMLSelectElement>) => {
              closeMenus();
              row.onRoundChange(Number(event.target.value));
            };

            const handleInvitesClick = () => {
              if (row.invitesDisabled) {
                return;
              }
              if (!row.invitesMenuAvailable) {
                closeMenus();
                row.onSendInvitesAll();
                return;
              }
              setOpenDecisionId(null);
              setOpenInvitesId((current) => (current === row.id ? null : row.id));
            };

            const handleDecisionToggle = () => {
              if (row.decisionDisabled) {
                return;
              }
              setOpenInvitesId(null);
              setOpenDecisionId((current) => (current === row.id ? null : row.id));
            };

            const handleDecisionSelect = (option: DecisionOption) => {
              closeMenus();
              row.onDecisionSelect(option);
            };

            return (
              <tr key={row.id}>
                <td>{row.candidateName}</td>
                <td>{row.candidatePosition}</td>
                <td>{row.createdOn}</td>
                <td>
                  {row.roundOptions.length > 1 ? (
                    <select value={row.selectedRound} onChange={handleRoundChange} className={styles.roundSelect}>
                      {row.roundOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roundLabel
                  )}
                </td>
                <td>{avgFitLabel}</td>
                <td>{avgCaseLabel}</td>
                <td>{formsLabel}</td>
                <td>{row.offerSummary}</td>
                <td>{row.processLabel}</td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionsRow}>
                    <div className={styles.buttonWithMenu}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.neutralButton}`}
                        onClick={handleInvitesClick}
                        disabled={row.invitesDisabled}
                        data-tooltip={row.invitesDisabled ? row.invitesTooltip : undefined}
                      >
                        {row.invitesButtonLabel}
                      </button>
                      {row.invitesMenuAvailable && isInvitesMenuOpen && (
                        <div className={styles.dropdownMenu}>
                          <button
                            type="button"
                            className={styles.dropdownItem}
                            onClick={() => {
                              closeMenus();
                              row.onSendInvitesAll();
                            }}
                          >
                            Send invites to all interviewers
                          </button>
                          <button
                            type="button"
                            className={styles.dropdownItem}
                            onClick={() => {
                              closeMenus();
                              row.onSendInvitesUpdated();
                            }}
                          >
                            Send invites only to updated interviewers
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.neutralButton}`}
                      onClick={() => {
                        closeMenus();
                        row.onEdit();
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.neutralButton}`}
                      onClick={() => {
                        closeMenus();
                        row.onOpenStatus();
                      }}
                    >
                      Results
                    </button>
                    <div className={`${styles.buttonWithMenu} ${styles.buttonWithMenuFullWidth}`}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.decisionButton} ${styles.decisionButtonExpanded} ${resolveDecisionToneClass(row.decisionSelection)}`}
                        onClick={handleDecisionToggle}
                        disabled={row.decisionDisabled}
                        data-tooltip={row.decisionDisabled ? row.decisionTooltip : undefined}
                      >
                        {row.decisionLabel}
                      </button>
                      {isDecisionMenuOpen && (
                        <div className={styles.dropdownMenu}>
                          {DECISION_OPTIONS.map((item) => (
                            <button
                              key={item.option}
                              type="button"
                              className={styles.dropdownItem}
                              onClick={() => handleDecisionSelect(item.option)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
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
