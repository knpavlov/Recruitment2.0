import { useEffect, useRef, useState } from 'react';
import { CandidateProfile, CandidateResume } from '../../../shared/types/candidate';
import styles from '../../../styles/CandidateModal.module.css';
import { generateId } from '../../../shared/ui/generateId';
import { convertFileToResume } from '../services/resumeAdapter';
import { parseResumeText } from '../services/resumeParser';

interface CandidateModalProps {
  initialProfile: CandidateProfile | null;
  onSave: (profile: CandidateProfile, options: { closeAfterSave: boolean; expectedVersion: number | null }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const createEmptyProfile = (): CandidateProfile => ({
  id: generateId(),
  version: 1,
  firstName: '',
  lastName: '',
  age: undefined,
  city: '',
  desiredPosition: '',
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

export const CandidateModal = ({ initialProfile, onSave, onDelete, onClose }: CandidateModalProps) => {
  const [profile, setProfile] = useState<CandidateProfile>(createEmptyProfile());
  const [resume, setResume] = useState<CandidateResume | undefined>(undefined);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setResume(initialProfile.resume);
    } else {
      const empty = createEmptyProfile();
      setProfile(empty);
      setResume(undefined);
    }
  }, [initialProfile]);

  const expectedVersion = initialProfile ? initialProfile.version : null;

  const handleChange = (field: keyof CandidateProfile, value: string | number | undefined) => {
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
  };

  const handleAiFill = async () => {
    if (!resume?.textContent) {
      setAiStatus('error');
      return;
    }
    setAiStatus('loading');
    await new Promise((resolve) => setTimeout(resolve, 600));
    const parsed = parseResumeText(resume.textContent);
    setProfile((prev) => ({ ...prev, ...parsed }));
    setAiStatus('success');
  };

  const submitSave = (closeAfterSave: boolean) => {
    onSave({ ...profile, resume }, { closeAfterSave, expectedVersion });
  };

  const handleDelete = () => {
    if (!initialProfile) {
      onClose();
      return;
    }
    onDelete(initialProfile.id);
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
                <p className={styles.resumeName}>{resume.fileName}</p>
                <p className={styles.resumeMeta}>
                  Uploaded {new Date(resume.uploadedAt).toLocaleString('en-US')} · {(resume.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <p>Drag a resume here or choose a file</p>
            )}
          </div>
          <div className={styles.uploadActions}>
            <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
              Choose file
            </button>
            <button className={styles.secondaryButton} onClick={() => submitSave(false)} disabled={!resume}>
              Save resume
            </button>
            <button className={styles.primaryButton} onClick={handleAiFill} disabled={!resume || aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'AI is analyzing…' : 'Fill with AI'}
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
            <span>First name</span>
            <input value={profile.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          </label>
          <label>
            <span>Last name</span>
            <input value={profile.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
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
            <span>Phone</span>
            <input value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input value={profile.email} onChange={(e) => handleChange('email', e.target.value)} />
          </label>
          <label className={styles.fullWidth}>
            <span>Professional summary</span>
            <textarea
              value={profile.experienceSummary}
              onChange={(e) => handleChange('experienceSummary', e.target.value)}
            />
          </label>
          <label>
            <span>Years of experience</span>
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
              placeholder="Comma separated"
            />
          </label>
          <label>
            <span>Most recent employer</span>
            <input value={profile.lastCompany} onChange={(e) => handleChange('lastCompany', e.target.value)} />
          </label>
          <label>
            <span>Most recent position</span>
            <input value={profile.lastPosition} onChange={(e) => handleChange('lastPosition', e.target.value)} />
          </label>
          <label>
            <span>Duration of last role</span>
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
            <button className={styles.secondaryButton} onClick={() => submitSave(false)}>
              Save
            </button>
            <button className={styles.primaryButton} onClick={() => submitSave(true)}>
              Save and close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
