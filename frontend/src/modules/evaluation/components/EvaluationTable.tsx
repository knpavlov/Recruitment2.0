import { useEffect, useRef, useState } from 'react';
import styles from '../../../styles/EvaluationScreen.module.css';

export interface EvaluationTableRow {
  id: string;
  candidateName: string;
  candidatePosition: string;
  roundNumber: number | null;
  roundOptions: Array<{ id: string; label: string }>;
  selectedRoundId: string;
  onSelectRound: (evaluationId: string) => void;
  formsCompleted: number;
  formsPlanned: number;
  avgFitScore: number | null;
  avgCaseScore: number | null;
  offerSummary: string;
  processStatus: 'draft' | 'in-progress' | 'completed';
  createdOn: string;
  createdAtValue: number;
  sendInvitesMode: 'initial' | 'resend';
  sendInvitesDisabled: boolean;
  sendInvitesTooltip?: string;
  onSendInvites: (mode: 'all' | 'updated') => void;
  decisionDisabled: boolean;
  decisionTooltip?: string;
  decisionLabel: string;
  onDecisionSelect: (option: 'offer' | 'progress' | 'reject') => void;
  onEdit: () => void;
  onOpenStatus: () => void;
}

export interface EvaluationTableProps {
  rows: EvaluationTableRow[];
  sortKey: 'name' | 'position' | 'round' | 'createdOn' | 'avgFit' | 'avgCase';
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: 'name' | 'position' | 'round' | 'createdOn' | 'avgFit' | 'avgCase') => void;
}

const SORTABLE_COLUMNS: Array<{
  key: EvaluationTableProps['sortKey'];
  title: string;
}> = [
  { key: 'name', title: 'Candidate' },
  { key: 'position', title: 'Position' },
  { key: 'round', title: 'Round' },
  { key: 'createdOn', title: 'Created on' },
  { key: 'avgFit', title: 'Avg fit score' },
  { key: 'avgCase', title: 'Avg case score' }
];

const getSortLabel = (direction: 'asc' | 'desc') => (direction === 'asc' ? '▲' : '▼');

export const EvaluationTable = ({ rows, sortDirection, sortKey, onSortChange }: EvaluationTableProps) => {
  const [openDecisionRow, setOpenDecisionRow] = useState<string | null>(null);
  const [openSendMenuRow, setOpenSendMenuRow] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpenDecisionRow(null);
        setOpenSendMenuRow(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <div className={styles.tableWrapper} ref={wrapperRef}>
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
                <td>
                  {row.roundOptions.length > 1 ? (
                    <select
                      className={styles.roundSelect}
                      value={row.selectedRoundId}
                      onChange={(event) => row.onSelectRound(event.target.value)}
                    >
                      {row.roundOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{row.roundOptions[0]?.label ?? '—'}</span>
                  )}
                </td>
                <td>{row.createdOn}</td>
                <td>{avgFitLabel}</td>
                <td>{avgCaseLabel}</td>
                <td>{formsLabel}</td>
                <td>{row.offerSummary}</td>
                <td>{processLabel}</td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionsRow}>
                    <div className={styles.actionButtonGroup}>
                      <div className={styles.buttonWithMenu}>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.neutralButton}`}
                          onClick={() => {
                            if (row.sendInvitesMode === 'initial') {
                              row.onSendInvites('all');
                              return;
                            }
                            setOpenDecisionRow(null);
                            setOpenSendMenuRow((current) => (current === row.id ? null : row.id));
                          }}
                          disabled={row.sendInvitesDisabled}
                          data-tooltip={row.sendInvitesDisabled ? row.sendInvitesTooltip : undefined}
                        >
                          Send invites
                        </button>
                        {row.sendInvitesMode === 'resend' && !row.sendInvitesDisabled && openSendMenuRow === row.id && (
                          <div className={styles.menu}>
                            <button
                              type="button"
                              className={styles.menuItem}
                              onClick={() => {
                                row.onSendInvites('all');
                                setOpenSendMenuRow(null);
                              }}
                            >
                              Send invites to all interviewers
                            </button>
                            <button
                              type="button"
                              className={styles.menuItem}
                              onClick={() => {
                                row.onSendInvites('updated');
                                setOpenSendMenuRow(null);
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
                    <div className={styles.buttonWithMenu}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.decisionButton}`}
                        disabled={row.decisionDisabled}
                        data-tooltip={row.decisionDisabled ? row.decisionTooltip : undefined}
                        onClick={() => {
                          if (row.decisionDisabled) {
                            return;
                          }
                          setOpenSendMenuRow(null);
                          setOpenDecisionRow((current) => (current === row.id ? null : row.id));
                        }}
                      >
                        {row.decisionLabel}
                      </button>
                      {!row.decisionDisabled && openDecisionRow === row.id && (
                        <div className={styles.menu}>
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.offerMenuItem}`}
                            onClick={() => {
                              row.onDecisionSelect('offer');
                              setOpenDecisionRow(null);
                            }}
                          >
                            Offer
                          </button>
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.progressMenuItem}`}
                            onClick={() => {
                              row.onDecisionSelect('progress');
                              setOpenDecisionRow(null);
                            }}
                          >
                            Progress to next round
                          </button>
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.rejectMenuItem}`}
                            onClick={() => {
                              row.onDecisionSelect('reject');
                              setOpenDecisionRow(null);
                            }}
                          >
                            Reject
                          </button>
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
