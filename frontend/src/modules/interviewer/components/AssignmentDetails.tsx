import { ChangeEvent } from 'react';
import { InterviewerAssignment } from '../../../shared/types/evaluation';
import styles from '../../../styles/InterviewerPortal.module.css';

interface AssignmentDetailsProps {
  assignment: InterviewerAssignment | null;
  formState: {
    fitScore: string;
    caseScore: string;
    notes: string;
  };
  onChange: (field: 'fitScore' | 'caseScore' | 'notes', value: string) => void;
  onSaveDraft: () => void;
  onSubmitFinal: () => void;
  isSaving: boolean;
  banner: { type: 'info' | 'error'; text: string } | null;
}

const formatSubmittedAt = (assignment: InterviewerAssignment) => {
  if (!assignment.form.submittedAt) {
    return null;
  }
  try {
    return new Date(assignment.form.submittedAt).toLocaleString();
  } catch {
    return assignment.form.submittedAt;
  }
};

export const AssignmentDetails = ({
  assignment,
  formState,
  onChange,
  onSaveDraft,
  onSubmitFinal,
  isSaving,
  banner
}: AssignmentDetailsProps) => {
  if (!assignment) {
    return <div className={styles.detailsPlaceholder}>Выберите интервью, чтобы просмотреть материалы.</div>;
  }

  const candidate = assignment.candidate;
  const submittedAt = formatSubmittedAt(assignment);
  const isSubmitted = assignment.form.submitted;
  const resume = candidate.resume;
  const caseFiles = assignment.caseFolder?.files ?? [];
  const fitQuestion = assignment.fitQuestion;

  const handleInputChange = (field: 'fitScore' | 'caseScore' | 'notes') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };

  return (
    <div className={styles.detailsCard}>
      <header className={styles.detailsHeader}>
        <div>
          <h2 className={styles.detailsTitle}>
            {candidate.lastName} {candidate.firstName}
          </h2>
          <p className={styles.detailsSubtitle}>{candidate.desiredPosition || 'Позиция не указана'}</p>
        </div>
        {isSubmitted && (
          <div className={styles.submissionInfo}>
            <span className={styles.statusTagSubmitted}>Оценка отправлена</span>
            {submittedAt && <span className={styles.submissionHint}>от {submittedAt}</span>}
          </div>
        )}
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <section className={styles.detailsSection}>
        <h3>Материалы кандидата</h3>
        <ul className={styles.resourceList}>
          {resume && (
            <li>
              <a href={resume.dataUrl} download={resume.fileName} className={styles.resourceLink}>
                Скачать резюме ({resume.fileName})
              </a>
            </li>
          )}
          {caseFiles.map((file) => (
            <li key={file.id}>
              <a href={file.dataUrl} download={file.fileName} className={styles.resourceLink}>
                Кейс: {file.fileName}
              </a>
            </li>
          ))}
          {!resume && caseFiles.length === 0 && <li>Материалы пока не прикреплены.</li>}
        </ul>
      </section>

      {fitQuestion && (
        <section className={styles.detailsSection}>
          <h3>Fit вопрос</h3>
          <p className={styles.fitContent}>{fitQuestion.content}</p>
          {fitQuestion.criteria.length > 0 && (
            <div className={styles.criteriaGrid}>
              {fitQuestion.criteria.map((criterion) => (
                <div key={criterion.id} className={styles.criterionCard}>
                  <h4>{criterion.title}</h4>
                  <ul>
                    {([1, 2, 3, 4, 5] as const).map((score) => {
                      const description = criterion.ratings[score];
                      if (!description) {
                        return null;
                      }
                      return (
                        <li key={score}>
                          <strong>{score}:</strong> {description}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.detailsSection}>
        <h3>Оценка интервью</h3>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>Оценка за fit (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={formState.fitScore}
              onChange={handleInputChange('fitScore')}
            />
          </label>
          <label className={styles.formField}>
            <span>Оценка за кейс (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={formState.caseScore}
              onChange={handleInputChange('caseScore')}
            />
          </label>
        </div>
        <label className={`${styles.formField} ${styles.fullWidthField}`}>
          <span>Комментарии и рекомендации</span>
          <textarea value={formState.notes} onChange={handleInputChange('notes')} rows={6} />
        </label>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.secondaryButton} onClick={onSaveDraft} disabled={isSaving}>
            Сохранить черновик
          </button>
          <button type="button" className={styles.primaryButton} onClick={onSubmitFinal} disabled={isSaving}>
            {isSubmitted ? 'Обновить оценку' : 'Отправить оценку'}
          </button>
        </div>
      </section>
    </div>
  );
};
