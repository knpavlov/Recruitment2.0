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
          <h2>{initialProfile ? 'Редактирование кандидата' : 'Новый кандидат'}</h2>
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
                  Загружено {new Date(resume.uploadedAt).toLocaleString('ru-RU')} · {(resume.size / 1024).toFixed(1)} Кб
                </p>
              </>
            ) : (
              <p>Перетащите резюме сюда или выберите файл</p>
            )}
          </div>
          <div className={styles.uploadActions}>
            <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
              Выбрать файл
            </button>
            <button className={styles.secondaryButton} onClick={() => submitSave(false)} disabled={!resume}>
              Сохранить резюме
            </button>
            <button className={styles.primaryButton} onClick={handleAiFill} disabled={!resume || aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'ИИ анализирует…' : 'Заполнить с помощью ИИ'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              onChange={(event) => event.target.files && handleResumeSelection(event.target.files)}
            />
          </div>
          {aiStatus === 'success' && <p className={styles.aiSuccess}>Данные заполнены автоматически.</p>}
          {aiStatus === 'error' && <p className={styles.aiError}>Загрузите текстовое резюме для анализа.</p>}
        </section>

        <div className={styles.formGrid}>
          <label>
            <span>Имя</span>
            <input value={profile.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          </label>
          <label>
            <span>Фамилия</span>
            <input value={profile.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
          </label>
          <label>
            <span>Возраст</span>
            <input
              value={profile.age ?? ''}
              onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : undefined)}
              type="number"
              min={0}
            />
          </label>
          <label>
            <span>Город</span>
            <input value={profile.city} onChange={(e) => handleChange('city', e.target.value)} />
          </label>
          <label>
            <span>Желаемая позиция</span>
            <input value={profile.desiredPosition} onChange={(e) => handleChange('desiredPosition', e.target.value)} />
          </label>
          <label>
            <span>Телефон</span>
            <input value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input value={profile.email} onChange={(e) => handleChange('email', e.target.value)} />
          </label>
          <label className={styles.fullWidth}>
            <span>Summary профессионального опыта</span>
            <textarea
              value={profile.experienceSummary}
              onChange={(e) => handleChange('experienceSummary', e.target.value)}
            />
          </label>
          <label>
            <span>Кол-во лет опыта</span>
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
            <span>Кол-во лет в консалтинге</span>
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
            <span>Консалтинговые фирмы</span>
            <input
              value={profile.consultingCompanies}
              onChange={(e) => handleChange('consultingCompanies', e.target.value)}
              placeholder="Через запятую"
            />
          </label>
          <label>
            <span>Место последней работы</span>
            <input value={profile.lastCompany} onChange={(e) => handleChange('lastCompany', e.target.value)} />
          </label>
          <label>
            <span>Должность последней работы</span>
            <input value={profile.lastPosition} onChange={(e) => handleChange('lastPosition', e.target.value)} />
          </label>
          <label>
            <span>Продолжительность последней работы</span>
            <input value={profile.lastDuration} onChange={(e) => handleChange('lastDuration', e.target.value)} />
          </label>
        </div>

        <footer className={styles.footer}>
          <button className={styles.dangerButton} onClick={handleDelete} disabled={!initialProfile}>
            Удалить профиль
          </button>
          <div className={styles.footerActions}>
            <button className={styles.secondaryButton} onClick={onClose}>
              Отмена
            </button>
            <button className={styles.secondaryButton} onClick={() => submitSave(false)}>
              Сохранить
            </button>
            <button className={styles.primaryButton} onClick={() => submitSave(true)}>
              Сохранить и закрыть
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
