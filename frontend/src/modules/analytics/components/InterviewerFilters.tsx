import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
      const wrapper = selectorRef.current;
      const menu = menuRef.current;
      if (
        wrapper &&
        !wrapper.contains(target) &&
        (!menu || !menu.contains(target))
      ) {
        setSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!selectorOpen) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const wrapper = selectorRef.current;
      if (!wrapper) {
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      const width = 320;
      const horizontalMargin = 16;
      const viewportRight = window.scrollX + window.innerWidth - horizontalMargin;
      let left = rect.left + window.scrollX;
      if (left + width > viewportRight) {
        left = Math.max(window.scrollX + horizontalMargin, viewportRight - width);
      }
      const top = rect.bottom + window.scrollY + 8;
      setMenuPosition({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selectorOpen]);

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

  const dropdown =
    selectorOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className={styles.dropdownMenu}
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
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
                        {interviewer.role ? (
                          <span className={styles.roleBadge}>{interviewer.role}</span>
                        ) : null}
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
            onClick={() => !disabled && setSelectorOpen((state) => !state)}
            disabled={disabled}
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

      {dropdown}
    </div>
  );
};
