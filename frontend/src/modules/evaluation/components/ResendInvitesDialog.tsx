import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/ResendInvitesDialog.module.css';
import { EvaluationConfig } from '../../../shared/types/evaluation';

interface ResendInvitesDialogProps {
  evaluation: EvaluationConfig | null;
  onSubmit: (slotIds: string[]) => void;
  onClose: () => void;
}

interface ResendOption {
  slotId: string;
  interviewerName: string;
  interviewerEmail: string;
  hasPendingChanges: boolean;
  lastSentAt?: string;
}

export const ResendInvitesDialog = ({ evaluation, onSubmit, onClose }: ResendInvitesDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const options = useMemo<ResendOption[]>(() => {
    if (!evaluation) {
      return [];
    }
    const slotStates =
      evaluation.invitationState.slots.length > 0
        ? evaluation.invitationState.slots
        : evaluation.interviews.map((slot) => ({
            slotId: slot.id,
            interviewerName: slot.interviewerName,
            interviewerEmail: slot.interviewerEmail,
            hasPendingChanges: true,
            lastSentAt: undefined
          }));

    const seen = new Set<string>();
    const normalized: ResendOption[] = [];

    for (const state of slotStates) {
      if (!state.slotId || seen.has(state.slotId)) {
        continue;
      }
      seen.add(state.slotId);
      normalized.push({
        slotId: state.slotId,
        interviewerName: state.interviewerName || 'Interviewer',
        interviewerEmail: state.interviewerEmail || '',
        hasPendingChanges: Boolean(state.hasPendingChanges),
        lastSentAt: state.lastSentAt
      });
    }

    return normalized;
  }, [evaluation]);

  useEffect(() => {
    if (!evaluation) {
      setSelected(new Set());
      return;
    }
    const defaults = options.filter((option) => option.hasPendingChanges).map((option) => option.slotId);
    const initial = defaults.length > 0 ? defaults : options.map((option) => option.slotId);
    setSelected(new Set(initial));
  }, [evaluation, options]);

  if (!evaluation) {
    return null;
  }

  const toggleSlot = (slotId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };

  const allSelected = options.length > 0 && selected.size === options.length;

  const handleSelectAll = () => {
    setSelected(() => {
      if (allSelected) {
        return new Set<string>();
      }
      return new Set(options.map((option) => option.slotId));
    });
  };

  const handleSubmit = () => {
    onSubmit(Array.from(selected));
  };

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="resend-title">
        <h2 id="resend-title" className={styles.title}>
          Resend invitations
        </h2>
        <p className={styles.subtitle}>Select interviewers to notify again.</p>
        <div className={styles.controls}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
            <span>Select all</span>
          </label>
        </div>
        <div className={styles.optionList}>
          {options.length === 0 ? (
            <p className={styles.emptyState}>Assign interviewers to this evaluation to resend invitations.</p>
          ) : (
            options.map((option) => {
              const checked = selected.has(option.slotId);
              return (
                <label key={option.slotId} className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSlot(option.slotId)}
                  />
                  <div className={styles.optionContent}>
                    <span className={styles.primaryText}>{option.interviewerName}</span>
                    <span className={styles.secondaryText}>
                      {option.interviewerEmail || 'Email will be requested before sending'}
                    </span>
                    {option.hasPendingChanges ? <span className={styles.badge}>Updated</span> : null}
                  </div>
                </label>
              );
            })
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={selected.size === 0}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
