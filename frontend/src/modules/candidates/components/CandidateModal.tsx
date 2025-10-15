import { useEffect, useRef, useState } from 'react';
import {
  CandidateProfile,
  CandidateResume,
  CandidateTargetPractice
} from '../../../shared/types/candidate';
import styles from '../../../styles/CandidateModal.module.css';
import { generateId } from '../../../shared/ui/generateId';
import { convertFileToResume } from '../services/resumeAdapter';
import { parseResumeText } from '../services/resumeParser';
import { formatAustralianDate } from '../../../shared/utils/dateFormat';

interface CandidateModalProps {
  initialProfile: CandidateProfile | null;
  onSave: (
    profile: CandidateProfile,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  feedback: { type: 'info' | 'error'; text: string } | null;
  onFeedbackClear: () => void;
}

const TARGET_PRACTICE_OPTIONS: CandidateTargetPractice[] = [
  'PI',
  'PEPI',
  'ET',
  'Tax',
  'Restructuring'
];

const createEmptyProfile = (): CandidateProfile => ({
  id: generateId(),
  version: 1,
  firstName: '',
  lastName: '',
  gender: undefined,
  age: undefined,
  city: '',
  desiredPosition: '',
  targetPractice: undefined,
  targetOffice: '',
  phone: '',
  email: '',
  experienceSummary: '',
  totalExperienceYears: undefined,
  consultingExperienceYears: undefined,
  consultingCompanies: '',
  lastCompany: '',
  lastPosition: '',
  lastDuration: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const CandidateModal = ({
  initialProfile,
  onSave,
  onDelete,
  onClose,
  feedback,
  onFeedbackClear
}: CandidateModalProps) => {
  const [profile, setProfile] = useState<CandidateProfile>(createEmptyProfile());
  const [resume, setResume] = useState<CandidateResume | undefined>(undefined);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile({ ...initialProfile, targetOffice: initialProfile.targetOffice ?? '' });
      setResume(initialProfile.resume);
    } else {
      const empty = createEmptyProfile();
      setProfile(empty);
      setResume(undefined);
    }
  }, [initialProfile]);

  const expectedVersion = initialProfile ? initialProfile.version : null;

  const handleChange = (field: keyof CandidateProfile, value: string | number | undefined) => {
    onFeedbackClear();
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleResumeSelection = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) {
      return;
    }
    const file = list[0];
    const converted = await convertFileToResume(file);
    setResume(converted);
    setProfile((prev) => ({ ...prev, resume: converted }));
    setAiStatus('idle');
    onFeedbackClear();
  };

  const handleResumeRemoval = () => {
    setResume(undefined);
    setProfile((prev) => ({ ...prev, resume: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAiStatus('idle');
    onFeedbackClear();
  };

  const handleAiFill = async () => {
    if (!resume?.textContent) {
      setAiStatus('error');
      return;
    }
    setAiStatus('loading');
    onFeedbackClear();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const parsed = parseResumeText(resume.textContent);
    setProfile((prev) => ({ ...prev, ...parsed }));
    setAiStatus('success');
  };

  const trimmedProfile: CandidateProfile = {
    ...profile,
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim()
  };

  const isProfileValid = Boolean(trimmedProfile.firstName && trimmedProfile.lastName);

  const submitSave = (closeAfterSave: boolean) => {
    setProfile(trimmedProfile);
    void onSave({ ...trimmedProfile, resume }, { closeAfterSave, expectedVersion });
  };

  const handleDelete = () => {
    if (!initialProfile) {
      onClose();
      return;
    }
    onFeedbackClear();
    void onDelete(initialProfile.id);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>{initialProfile ? 'Edit candidate' : 'New candidate'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </header>

        {feedback && (
          <div
            className={feedback.type === 'info' ? styles.feedbackInfo : styles.feedbackError}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </div>
        )}

        <section
          className={styles.uploadSection}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleResumeSelection(event.dataTransfer.files);
          }}
        >
          <div className={styles.uploadZone}>
            {resume ? (
              <>
                <a
                  className={styles.resumeLink}
                  href={resume.dataUrl}
                  download={resume.fileName}
                  rel="noopener noreferrer"
                >
                  <p className={styles.resumeName}>{resume.fileName}</p>
                </a>
                <p className={styles.resumeMeta}>
                  Uploaded {formatAustralianDate(resume.uploadedAt)} · {(resume.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <p>Drag a resume here or pick a file</p>
            )}
          </div>
          <div className={styles.uploadActions}>
            <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
              Choose file
            </button>
            <button
              className={styles.dangerButton}
              onClick={handleResumeRemoval}
              disabled={!resume}
            >
              Delete resume
            </button>
            <button className={styles.primaryButton} onClick={handleAiFill} disabled={!resume || aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'AI is analysing…' : 'Fill with AI'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              onChange={(event) => event.target.files && handleResumeSelection(event.target.files)}
            />
          </div>
          {aiStatus === 'success' && <p className={styles.aiSuccess}>Fields populated automatically.</p>}
          {aiStatus === 'error' && <p className={styles.aiError}>Upload a text-based resume for analysis.</p>}
        </section>

        <div className={styles.formGrid}>
          <label>
            <span className={styles.labelText}>
              First name<span className={styles.requiredMark}>*</span>
            </span>
            <input value={profile.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          </label>
          <label>
            <span className={styles.labelText}>
              Last name<span className={styles.requiredMark}>*</span>
            </span>
            <input value={profile.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
          </label>
          <label>
            <span>Gender</span>
            <select
              value={profile.gender ?? ''}
              onChange={(e) => handleChange('gender', e.target.value ? e.target.value : undefined)}
            >
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>
          <label>
            <span>Age</span>
            <input
              value={profile.age ?? ''}
              onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : undefined)}
              type="number"
              min={0}
            />
          </label>
          <label>
            <span>City</span>
            <input value={profile.city} onChange={(e) => handleChange('city', e.target.value)} />
          </label>
          <label>
            <span>Desired position</span>
            <input value={profile.desiredPosition} onChange={(e) => handleChange('desiredPosition', e.target.value)} />
          </label>
          <label>
            <span>Target practice</span>
            <select
              value={profile.targetPractice ?? ''}
              onChange={(e) =>
                handleChange('targetPractice', e.target.value ? (e.target.value as CandidateTargetPractice) : undefined)
              }
            >
              <option value="">Not selected</option>
              {TARGET_PRACTICE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Target office</span>
            <input value={profile.targetOffice} onChange={(e) => handleChange('targetOffice', e.target.value)} />
          </label>
          <label>
            <span>Phone</span>
            <input value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input value={profile.email} onChange={(e) => handleChange('email', e.target.value)} />
          </label>
          <label className={styles.fullWidth}>
            <span>Professional experience summary</span>
            <textarea
              value={profile.experienceSummary}
              onChange={(e) => handleChange('experienceSummary', e.target.value)}
            />
          </label>
          <label>
            <span>Total years of experience</span>
            <input
              value={profile.totalExperienceYears ?? ''}
              onChange={(e) =>
                handleChange('totalExperienceYears', e.target.value ? Number(e.target.value) : undefined)
              }
              type="number"
              min={0}
            />
          </label>
          <label>
            <span>Years in consulting</span>
            <input
              value={profile.consultingExperienceYears ?? ''}
              onChange={(e) =>
                handleChange(
                  'consultingExperienceYears',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              type="number"
              min={0}
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Consulting firms</span>
            <input
              value={profile.consultingCompanies}
              onChange={(e) => handleChange('consultingCompanies', e.target.value)}
              placeholder="Comma-separated"
            />
          </label>
          <label>
            <span>Most recent company</span>
            <input value={profile.lastCompany} onChange={(e) => handleChange('lastCompany', e.target.value)} />
          </label>
          <label>
            <span>Most recent position</span>
            <input value={profile.lastPosition} onChange={(e) => handleChange('lastPosition', e.target.value)} />
          </label>
          <label>
            <span>Duration at last job</span>
            <input value={profile.lastDuration} onChange={(e) => handleChange('lastDuration', e.target.value)} />
          </label>
        </div>

        <footer className={styles.footer}>
          <button className={styles.dangerButton} onClick={handleDelete} disabled={!initialProfile}>
            Delete profile
          </button>
          <div className={styles.footerActions}>
            <button className={styles.secondaryButton} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.secondaryButton} onClick={() => submitSave(false)} disabled={!isProfileValid}>
              Save
            </button>
            <button className={styles.primaryButton} onClick={() => submitSave(true)} disabled={!isProfileValid}>
              Save and close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
