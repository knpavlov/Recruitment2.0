import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../../styles/AnalyticsScreen.module.css';
import type { InterviewerDescriptor } from '../types/analytics';
import type { InterviewerSeniority } from '../../../shared/types/account';

const ROLE_OPTIONS: InterviewerSeniority[] = ['MD', 'SD', 'D', 'SM', 'M', 'SA', 'A'];

interface InterviewerFiltersProps {
  interviewers: InterviewerDescriptor[];
  selectedInterviewers: string[];
  onInterviewerChange: (ids: string[]) => void;
  selectedRoles: InterviewerSeniority[];
  onRoleChange: (roles: InterviewerSeniority[]) => void;
  disabled?: boolean;
}

export const InterviewerFilters = ({
  interviewers,
  selectedInterviewers,
  onInterviewerChange,
  selectedRoles,
  onRoleChange,
  disabled = false
}: InterviewerFiltersProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const interviewerSet = useMemo(
    () => new Set(selectedInterviewers.map((id) => id.toLowerCase())),
    [selectedInterviewers]
  );
  const roleSet = useMemo(() => new Set(selectedRoles), [selectedRoles]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (selectorRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      setSelectorOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!selectorOpen) {
      return undefined;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectorOpen]);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    if (typeof window === 'undefined') {
      return;
    }
    const maxAvailableWidth = Math.max(200, window.innerWidth - 24);
    const width = Math.min(Math.max(rect.width, 320), maxAvailableWidth);
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width
    });
  }, []);

  useEffect(() => {
    if (!selectorOpen) {
      setMenuPosition(null);
      menuRef.current = null;
      return undefined;
    }
    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [selectorOpen, updateMenuPosition]);

  const toggleInterviewer = (id: string) => {
    const normalized = id.toLowerCase();
    onInterviewerChange(
      interviewerSet.has(normalized)
        ? selectedInterviewers.filter((value) => value.toLowerCase() !== normalized)
        : [...selectedInterviewers, id]
    );
  };

  const handleSelectAll = () => {
    if (disabled) {
      return;
    }
    onInterviewerChange(interviewers.map((item) => item.id));
    setSelectorOpen(false);
  };

  const handleReset = () => {
    onInterviewerChange([]);
    setSelectorOpen(false);
  };

  const handleRoleToggle = (role: InterviewerSeniority) => {
    if (disabled) {
      return;
    }
    if (roleSet.has(role)) {
      onRoleChange(selectedRoles.filter((value) => value !== role));
    } else {
      onRoleChange([...selectedRoles, role]);
    }
  };

  const handleRoleReset = () => {
    if (disabled) {
      return;
    }
    onRoleChange([]);
  };

  const selectedCount = selectedInterviewers.length;
  const selectorLabel = selectedCount ? `${selectedCount} selected` : 'All interviewers';

  const wrapperClassName = selectorOpen
    ? `${styles.dropdownWrapper} ${styles.dropdownWrapperOpen}`
    : styles.dropdownWrapper;

  const menu =
    selectorOpen && menuPosition
      ? createPortal(
          <div
            ref={(node) => {
              menuRef.current = node;
            }}
            className={styles.dropdownMenu}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width
            }}
          >
            <div className={styles.dropdownActions}>
              <button type="button" onClick={handleSelectAll} disabled={!interviewers.length}>
                Select all
              </button>
              <button type="button" onClick={handleReset} disabled={!selectedInterviewers.length}>
                Clear
              </button>
            </div>
            <div className={styles.dropdownList}>
              {interviewers.length ? (
                interviewers.map((interviewer) => {
                  const isChecked = interviewerSet.has(interviewer.id.toLowerCase());
                  return (
                    <label key={interviewer.id} className={styles.dropdownOption}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleInterviewer(interviewer.id)}
                      />
                      <span className={styles.dropdownLabel}>
                        {interviewer.name}
                        {interviewer.role ? <span className={styles.roleBadge}>{interviewer.role}</span> : null}
                      </span>
                    </label>
                  );
                })
              ) : (
                <span>No interviewers available.</span>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={styles.interviewerFilters}>
      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Interviewer filter</label>
        <div className={wrapperClassName} ref={selectorRef}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              if (disabled) {
                return;
              }
              setSelectorOpen((state) => !state);
            }}
            disabled={disabled}
            ref={triggerRef}
          >
            {selectorLabel}
          </button>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel}>Role filter</label>
        <div className={styles.roleToggleGroup}>
          {ROLE_OPTIONS.map((role) => {
            const active = roleSet.has(role);
            return (
              <button
                key={role}
                type="button"
                className={`${styles.roleToggle} ${active ? styles.roleToggleActive : ''}`}
                onClick={() => handleRoleToggle(role)}
                disabled={disabled}
              >
                {role}
              </button>
            );
          })}
          <button
            type="button"
            className={styles.roleReset}
            onClick={handleRoleReset}
            disabled={!selectedRoles.length || disabled}
          >
            Clear roles
          </button>
        </div>
      </div>
      {menu}
    </div>
  );
};
