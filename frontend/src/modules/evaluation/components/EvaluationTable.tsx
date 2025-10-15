import { ChangeEvent, useEffect, useState } from 'react';
import styles from '../../../styles/EvaluationScreen.module.css';

type DecisionOption = 'offer' | 'progress' | 'reject';

type SortableColumnKey = 'name' | 'position' | 'created' | 'round' | 'avgFit' | 'avgCase';

type InviteOption = {
  slotId: string;
  name: string;
  email: string;
};

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
  invitesPendingChanges: boolean;
  inviteOptions: InviteOption[];
  onSendInvites: (slotIds: string[] | null) => void;
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

interface ResendInvitesControlProps {
  buttonLabel: string;
  disabled: boolean;
  tooltip?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  options: InviteOption[];
  hasPendingChanges: boolean;
  onSend: (slotIds: string[]) => void;
}

const ResendInvitesControl = ({
  buttonLabel,
  disabled,
  tooltip,
  open,
  onToggle,
  onClose,
  options,
  hasPendingChanges,
  onSend
}: ResendInvitesControlProps) => {
  const [selection, setSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelection(new Set(options.map((item) => item.slotId)));
    } else {
      setSelection(new Set());
    }
  }, [open, options]);

  const toggleSlot = (slotId: string) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };

  const allSelected = options.length > 0 && selection.size === options.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelection(new Set());
      return;
    }
    setSelection(new Set(options.map((item) => item.slotId)));
  };

  const sendDisabled = selection.size === 0;

  const handleSend = () => {
    if (sendDisabled) {
      return;
    }
    onSend(Array.from(selection));
    onClose();
  };

  const helperText = hasPendingChanges
    ? 'Share the latest updates with selected interviewers.'
    : 'Resend invitations to selected interviewers.';

  return (
    <div className={styles.buttonWithMenu}>
      <button
        type="button"
        className={`${styles.actionButton} ${styles.neutralButton}`}
        onClick={() => {
          if (disabled) {
            return;
          }
          onToggle();
        }}
        disabled={disabled}
        data-tooltip={tooltip ?? undefined}
      >
        {buttonLabel}
      </button>
      {open && (
        <div className={styles.invitesMenu}>
          <p className={styles.invitesMenuHeader}>{helperText}</p>
          <label className={styles.invitesSelectAll}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Select all</span>
          </label>
          <div className={styles.invitesList}>
            {options.map((option) => (
              <label key={option.slotId} className={styles.invitesOption}>
                <input
                  type="checkbox"
                  checked={selection.has(option.slotId)}
                  onChange={() => toggleSlot(option.slotId)}
                />
                <div className={styles.invitesOptionText}>
                  <span className={styles.invitesOptionName}>{option.name}</span>
                  <span className={styles.invitesOptionEmail}>{option.email}</span>
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={styles.invitesSendButton}
            disabled={sendDisabled}
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export const EvaluationTable = ({ rows, sortDirection, sortKey, onSortChange }: EvaluationTableProps) => {
  const [openDecisionId, setOpenDecisionId] = useState<string | null>(null);
  const [openInvitesId, setOpenInvitesId] = useState<string | null>(null);

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

            const handleInvitesClick = () => {
              if (row.invitesDisabled || !row.hasInvitations) {
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
                      {row.hasInvitations ? (
                        <ResendInvitesControl
                          buttonLabel={row.invitesButtonLabel}
                          disabled={row.invitesDisabled}
                          tooltip={row.invitesTooltip}
                          open={isInvitesMenuOpen}
                          onToggle={handleInvitesClick}
                          onClose={closeMenus}
                          options={row.inviteOptions}
                          hasPendingChanges={row.invitesPendingChanges}
                          onSend={(slotIds) => {
                            closeMenus();
                            row.onSendInvites(slotIds);
                          }}
                        />
                      ) : (
                        <div className={styles.buttonWithMenu}>
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.neutralButton}`}
                            onClick={() => {
                              closeMenus();
                              row.onSendInvites(null);
                            }}
                            disabled={row.invitesDisabled}
                            data-tooltip={row.invitesTooltip ?? undefined}
                          >
                            {row.invitesButtonLabel}
                          </button>
                        </div>
                      )}
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
