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
  hasInvitations: boolean;
  invitees: Array<{ slotId: string; label: string }>;
  onSendInvites: (slotIds?: string[]) => void;
  onEdit: () => void;
  onOpenStatus: () => void;
  decisionDisabled: boolean;
  decisionTooltip?: string;
  decisionLabel: string;
  decisionState: DecisionOption | null;
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
  const [inviteSelections, setInviteSelections] = useState<Record<string, string[]>>({});

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
            const decisionButtonClassName = `${styles.actionButton} ${styles.decisionButton} ${
              row.decisionState === 'offer'
                ? styles.decisionOffer
                : row.decisionState === 'reject'
                  ? styles.decisionReject
                  : row.decisionState === 'progress'
                    ? styles.decisionProgress
                    : styles.decisionNeutral
            }`;

            const handleRoundChange = (event: ChangeEvent<HTMLSelectElement>) => {
              closeMenus();
              row.onRoundChange(Number(event.target.value));
            };

            const currentSelection = inviteSelections[row.id] ?? row.invitees.map((item) => item.slotId);
            const selectionSet = new Set(currentSelection);
            const allSelected = row.invitees.length > 0 && selectionSet.size === row.invitees.length;

            const updateSelection = (updater: (previous: Set<string>) => Set<string>) => {
              setInviteSelections((prev) => {
                const next = new Set(prev[row.id] ?? row.invitees.map((item) => item.slotId));
                const updated = updater(next);
                return { ...prev, [row.id]: Array.from(updated) };
              });
            };

            const toggleInvitee = (slotId: string) => {
              updateSelection((previous) => {
                const copy = new Set(previous);
                if (copy.has(slotId)) {
                  copy.delete(slotId);
                } else {
                  copy.add(slotId);
                }
                return copy;
              });
            };

            const toggleSelectAll = (checked: boolean) => {
              setInviteSelections((prev) => ({
                ...prev,
                [row.id]: checked ? row.invitees.map((item) => item.slotId) : []
              }));
            };

            const handleInvitesClick = () => {
              if (row.invitesDisabled) {
                return;
              }
              if (!row.hasInvitations) {
                closeMenus();
                row.onSendInvites();
                return;
              }
              if (openInvitesId === row.id) {
                setOpenInvitesId(null);
                return;
              }
              setOpenDecisionId(null);
              setInviteSelections((prev) => ({
                ...prev,
                [row.id]: row.invitees.map((item) => item.slotId)
              }));
              setOpenInvitesId(row.id);
            };

            const handleSendSelection = () => {
              const unique = Array.from(new Set(inviteSelections[row.id] ?? row.invitees.map((item) => item.slotId)));
              closeMenus();
              row.onSendInvites(unique);
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
                  <div className={styles.actionsGrid}>
                    <div className={styles.actionCell}>
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
                    </div>
                    <div className={styles.actionCell}>
                      <div className={styles.buttonWithMenu}>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.neutralButton}`}
                          onClick={handleInvitesClick}
                          disabled={row.invitesDisabled}
                          data-tooltip={row.invitesTooltip ?? undefined}
                        >
                          {row.invitesButtonLabel}
                        </button>
                        {row.hasInvitations && isInvitesMenuOpen && (
                          <div className={styles.dropdownMenu}>
                            <label className={styles.inviteOption}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(event) => toggleSelectAll(event.target.checked)}
                              />
                              <span>Select all</span>
                            </label>
                            <div className={styles.inviteOptions}>
                              {row.invitees.map((invitee) => {
                                const checked = selectionSet.has(invitee.slotId);
                                return (
                                  <label key={invitee.slotId} className={styles.inviteOption}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleInvitee(invitee.slotId)}
                                    />
                                    <span>{invitee.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              className={`${styles.actionButton} ${styles.dropdownSendButton}`}
                              onClick={handleSendSelection}
                              disabled={selectionSet.size === 0}
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.actionCell}>
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
                    </div>
                    <div className={styles.actionCell}>
                      <div className={styles.buttonWithMenu}>
                        <button
                          type="button"
                          className={decisionButtonClassName}
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
