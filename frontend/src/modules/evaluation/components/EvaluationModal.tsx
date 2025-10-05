import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/EvaluationModal.module.css';
import { EvaluationConfig, InterviewSlot, InterviewStatusRecord } from '../../../shared/types/evaluation';
import { CandidateProfile } from '../../../shared/types/candidate';
import { CaseFolder } from '../../../shared/types/caseLibrary';
import { generateId } from '../../../shared/ui/generateId';

interface EvaluationModalProps {
  initialConfig: EvaluationConfig | null;
  onSave: (config: EvaluationConfig, options: { closeAfterSave: boolean; expectedVersion: number | null }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  candidates: CandidateProfile[];
  folders: CaseFolder[];
}

const createInterviewSlot = (): InterviewSlot => ({
  id: generateId(),
  interviewerName: '',
  interviewerEmail: ''
});

const createStatusRecord = (slot: InterviewSlot): InterviewStatusRecord => ({
  slotId: slot.id,
  interviewerName: slot.interviewerName || 'Интервьюер',
  submitted: false
});

const createDefaultConfig = (): EvaluationConfig => {
  const interviews = [createInterviewSlot()];
  return {
    id: generateId(),
    candidateId: undefined,
    roundNumber: 1,
    interviewCount: 1,
    interviews,
    fitQuestionId: undefined,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    forms: interviews.map((slot) => createStatusRecord(slot))
  };
};

export const EvaluationModal = ({
  initialConfig,
  onSave,
  onDelete,
  onClose,
  candidates,
  folders
}: EvaluationModalProps) => {
  const [config, setConfig] = useState<EvaluationConfig>(createDefaultConfig());

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      setConfig(createDefaultConfig());
    }
  }, [initialConfig]);

  const expectedVersion = initialConfig ? initialConfig.version : null;

  const updateInterviews = (updater: (current: InterviewSlot[]) => InterviewSlot[]) => {
    setConfig((prev) => {
      const interviews = updater(prev.interviews);
      const forms = interviews.map((slot) => {
        const existing = prev.forms.find((form) => form.slotId === slot.id);
        return existing
          ? { ...existing, interviewerName: slot.interviewerName || existing.interviewerName }
          : createStatusRecord(slot);
      });
      return { ...prev, interviews, interviewCount: interviews.length, forms };
    });
  };

  const updateInterview = (slotId: string, patch: Partial<InterviewSlot>) => {
    updateInterviews((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );
  };

  const changeInterviewCount = (count: number) => {
    updateInterviews((current) => {
      if (count > current.length) {
        const additions = Array.from({ length: count - current.length }, () => createInterviewSlot());
        return [...current, ...additions];
      }
      return current.slice(0, count);
    });
  };

  const handleDelete = () => {
    if (!initialConfig) {
      onClose();
      return;
    }
    onDelete(initialConfig.id);
  };

  const submit = (closeAfterSave: boolean) => {
    onSave(config, { closeAfterSave, expectedVersion });
  };

  const candidateOptions = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.lastName} ${candidate.firstName}`.trim() || 'Без имени'
      })),
    [candidates]
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>{initialConfig ? 'Редактирование оценки' : 'Новая оценка'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.content}>
          <label className={styles.fullWidth}>
            <span>Кандидат</span>
            <select
              value={config.candidateId || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, candidateId: e.target.value || undefined }))}
            >
              <option value="">Не выбран</option>
              {candidateOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Номер раунда</span>
            <input
              type="number"
              min={1}
              value={config.roundNumber ?? 1}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, roundNumber: Number(e.target.value) || undefined }))
              }
            />
          </label>

          <label>
            <span>Количество интервью</span>
            <input
              type="number"
              min={1}
              value={config.interviewCount}
              onChange={(e) => changeInterviewCount(Number(e.target.value) || 1)}
            />
          </label>

          <label className={styles.fullWidth}>
            <span>Фит вопрос</span>
            <select
              value={config.fitQuestionId || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, fitQuestionId: e.target.value || undefined }))}
            >
              <option value="">Не выбран</option>
              <option value="culture">Стандартный вопрос о культуре</option>
            </select>
          </label>

          <div className={styles.interviewsList}>
            {config.interviews.map((slot, index) => (
              <div key={slot.id} className={styles.interviewBlock}>
                <h3>Интервью {index + 1}</h3>
                <label>
                  <span>Имя интервьюера</span>
                  <input
                    value={slot.interviewerName}
                    onChange={(e) => updateInterview(slot.id, { interviewerName: e.target.value })}
                  />
                </label>
                <label>
                  <span>Email интервьюера</span>
                  <input
                    value={slot.interviewerEmail}
                    onChange={(e) => updateInterview(slot.id, { interviewerEmail: e.target.value })}
                  />
                </label>
                <label>
                  <span>Кейс</span>
                  <select
                    value={slot.caseFolderId || ''}
                    onChange={(e) => updateInterview(slot.id, { caseFolderId: e.target.value || undefined })}
                  >
                    <option value="">Не выбран</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Фит вопрос</span>
                  <select
                    value={slot.fitQuestionId || ''}
                    onChange={(e) => updateInterview(slot.id, { fitQuestionId: e.target.value || undefined })}
                  >
                    <option value="">По умолчанию</option>
                    <option value="culture">Стандартный вопрос</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>

        <footer className={styles.footer}>
          <button className={styles.dangerButton} onClick={handleDelete} disabled={!initialConfig}>
            Удалить оценку
          </button>
          <div className={styles.footerActions}>
            <button className={styles.secondaryButton} onClick={onClose}>
              Отмена
            </button>
            <button className={styles.secondaryButton} onClick={() => submit(false)}>
              Сохранить
            </button>
            <button className={styles.primaryButton} onClick={() => submit(true)}>
              Сохранить и закрыть
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
