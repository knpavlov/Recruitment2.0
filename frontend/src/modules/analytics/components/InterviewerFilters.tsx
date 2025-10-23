import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerDescriptor, InterviewerSeniority } from '../types/analytics';

const ROLE_LABELS: Record<InterviewerSeniority, string> = {
  MD: 'Managing Director',
  SD: 'Senior Director',
  D: 'Director',
  SM: 'Senior Manager',
  M: 'Manager',
  SA: 'Senior Associate',
  A: 'Associate'
};

const ROLE_OPTIONS: InterviewerSeniority[] = ['MD', 'SD', 'D', 'SM', 'M', 'SA', 'A'];

interface InterviewerFiltersProps {
  interviewers: InterviewerDescriptor[];
  selectedInterviewers: string[];
  manualInterviewers: string[];
  onManualChange: (ids: string[]) => void;
  roleShortcuts: InterviewerSeniority[];
  onRoleShortcutsChange: (roles: InterviewerSeniority[]) => void;
  excludedInterviewers: string[];
  onExcludedChange: (ids: string[]) => void;
  selectedRoles: InterviewerSeniority[];
  onRoleChange: (roles: InterviewerSeniority[]) => void;
}

export const InterviewerFilters = ({
  interviewers,
  selectedInterviewers,
  manualInterviewers,
  onManualChange,
  roleShortcuts,
  onRoleShortcutsChange,
  excludedInterviewers,
  onExcludedChange,
  selectedRoles,
  onRoleChange
}: InterviewerFiltersProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(
    () => new Set(selectedInterviewers.map((id) => id.toLowerCase())),
    [selectedInterviewers]
  );
  const manualSet = useMemo(() => new Set(manualInterviewers.map((id) => id.toLowerCase())), [manualInterviewers]);
  const excludedSet = useMemo(
    () => new Set(excludedInterviewers.map((id) => id.toLowerCase())),
    [excludedInterviewers]
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableInterviewers = useMemo(() => {
    if (!selectedRoles.length) {
      return interviewers;
    }
    return interviewers.filter((item) => item.role && selectedRoles.includes(item.role));
  }, [interviewers, selectedRoles]);

  const toggleInterviewer = (id: string) => {
    const normalized = id.toLowerCase();
    if (manualSet.has(normalized)) {
      onManualChange(manualInterviewers.filter((value) => value.toLowerCase() !== normalized));
      return;
    }
    if (selectedSet.has(normalized)) {
      if (excludedSet.has(normalized)) {
        onExcludedChange(excludedInterviewers.filter((value) => value.toLowerCase() !== normalized));
      } else {
        onExcludedChange([...excludedInterviewers, id]);
      }
      return;
    }
    if (excludedSet.has(normalized)) {
      onExcludedChange(excludedInterviewers.filter((value) => value.toLowerCase() !== normalized));
    }
    onManualChange([...manualInterviewers, id]);
  };

  const selectAll = () => {
    if (!availableInterviewers.length) {
      return;
    }
    onManualChange(availableInterviewers.map((item) => item.id));
    if (excludedInterviewers.length) {
      onExcludedChange([]);
    }
    setSelectorOpen(false);
  };

  const clearSelection = () => {
    onManualChange([]);
    onRoleShortcutsChange([]);
    onExcludedChange([]);
    setSelectorOpen(false);
  };

  const toggleRole = (role: InterviewerSeniority) => {
    if (selectedRoles.includes(role)) {
      onRoleChange(selectedRoles.filter((item) => item !== role));
    } else {
      onRoleChange([...selectedRoles, role]);
    }
  };

  const toggleRoleShortcut = (role: InterviewerSeniority) => {
    if (roleShortcuts.includes(role)) {
      onRoleShortcutsChange(roleShortcuts.filter((item) => item !== role));
      return;
    }
    onRoleShortcutsChange([...roleShortcuts, role]);
  };

  const clearRoleShortcuts = () => {
    if (roleShortcuts.length) {
      onRoleShortcutsChange([]);
    }
    if (excludedInterviewers.length) {
      onExcludedChange([]);
    }
  };

  const clearRoles = () => {
    onRoleChange([]);
  };

  const roleLabel = selectedRoles.length
    ? `${selectedRoles.length} ${selectedRoles.length === 1 ? 'role' : 'roles'} selected`
    : 'All roles';
  const interviewerLabel = selectedInterviewers.length
    ? `${selectedInterviewers.length} selected`
    : 'All interviewers';
  const shortcutLabel = roleShortcuts.length
    ? `${roleShortcuts.length} ${roleShortcuts.length === 1 ? 'role group' : 'role groups'} active`
    : 'No quick selections';

  return (
    <div className={styles.interviewerFilters}>
      <div className={styles.roleFilterBlock}>
        <span className={styles.inputLabel}>Role filter</span>
        <div className={styles.roleChipRow}>
          {ROLE_OPTIONS.map((role) => {
            const active = selectedRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                className={`${styles.roleChip} ${active ? styles.roleChipActive : ''}`}
                onClick={() => toggleRole(role)}
              >
                {ROLE_LABELS[role]}
              </button>
            );
          })}
          <button type="button" className={styles.roleChipReset} onClick={clearRoles}>
            Reset
          </button>
          <span className={styles.roleSummary}>{roleLabel}</span>
        </div>
      </div>
      <div className={styles.quickSelectBlock}>
        <div className={styles.quickSelectHeader}>
          <span className={styles.inputLabel}>Quick select by role</span>
          <span className={styles.roleSummary}>{shortcutLabel}</span>
        </div>
        <div className={styles.quickSelectGrid}>
          {ROLE_OPTIONS.map((role) => {
            const active = roleShortcuts.includes(role);
            return (
              <label key={role} className={`${styles.quickSelectOption} ${active ? styles.quickSelectOptionActive : ''}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleRoleShortcut(role)}
                />
                <span>{ROLE_LABELS[role]}</span>
              </label>
            );
          })}
          <button type="button" className={styles.quickSelectReset} onClick={clearRoleShortcuts}>
            Clear quick select
          </button>
        </div>
      </div>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Interviewer filter</label>
        <div className={styles.dropdownWrapper} ref={selectorRef}>
          <button type="button" className={styles.secondaryButton} onClick={() => setSelectorOpen((state) => !state)}>
            {interviewerLabel}
          </button>
          {selectorOpen ? (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownActions}>
                <button type="button" onClick={selectAll}>
                  Select all
                </button>
                <button type="button" onClick={clearSelection}>
                  Clear
                </button>
              </div>
              <div className={styles.dropdownList}>
                {availableInterviewers.length ? (
                  availableInterviewers.map((interviewer) => {
                    const checked = selectedSet.has(interviewer.id.toLowerCase());
                    return (
                      <label key={interviewer.id} className={styles.dropdownOption}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInterviewer(interviewer.id)}
                        />
                        <span>{interviewer.name}</span>
                      </label>
                    );
                  })
                ) : (
                  <span>No interviewers for the selected roles.</span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
