import { useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateCard } from './components/CandidateCard';
import { useCandidatesState } from '../../app/state/AppStateContext';
import { CandidateProfile } from '../../shared/types/candidate';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const CandidatesScreen = () => {
  const { list, saveProfile, removeProfile } = useCandidatesState();
  const [banner, setBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<CandidateProfile | null>(null);

  const sortedCandidates = useMemo(
    () => [...list].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ru-RU')),
    [list]
  );

  const handleCreate = () => {
    setModalCandidate(null);
    setIsModalOpen(true);
  };

  const handleSave = (profile: CandidateProfile, options: { closeAfterSave: boolean; expectedVersion: number | null }) => {
    const result = saveProfile(profile, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setBanner({ type: 'error', text: 'Изменения не сохранены: запись уже обновлена другим пользователем. Обновите страницу.' });
      } else {
        setBanner({ type: 'error', text: 'Проверьте заполнение обязательных полей.' });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Карточка кандидата сохранена.' });

    if (options.closeAfterSave) {
      setIsModalOpen(false);
    } else {
      setModalCandidate(result.data);
    }
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('Удалить карточку кандидата безвозвратно?');
    if (!confirmed) {
      return;
    }
    const result = removeProfile(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Не удалось удалить кандидата.' });
      return;
    }
    setBanner({ type: 'info', text: 'Карточка кандидата удалена.' });
    setIsModalOpen(false);
    setModalCandidate(null);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>База кандидатов</h1>
          <p className={styles.subtitle}>Создавайте и редактируйте карточки кандидатов с помощью ИИ.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Создать профиль
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {sortedCandidates.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Пока нет кандидатов</h2>
            <p>Используйте кнопку «Создать профиль», чтобы добавить первого кандидата.</p>
          </div>
        ) : (
          sortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              profile={candidate}
              onOpen={() => {
                setModalCandidate(candidate);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <CandidateModal
          initialProfile={modalCandidate}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
};
