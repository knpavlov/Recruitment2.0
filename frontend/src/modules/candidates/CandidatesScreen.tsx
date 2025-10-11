import { useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateCard } from './components/CandidateCard';
import { useCandidatesState } from '../../app/state/AppStateContext';
import { CandidateProfile } from '../../shared/types/candidate';

type SortMode = 'updated' | 'name' | 'position';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const CandidatesScreen = () => {
  const { list, saveProfile, removeProfile } = useCandidatesState();
  const [banner, setBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<CandidateProfile | null>(null);
  const [modalBanner, setModalBanner] = useState<Banner>(null);
  const [sortMode, setSortMode] = useState<SortMode>('updated');

  const sortedCandidates = useMemo(
    () => {
      const copy = [...list];
      if (sortMode === 'name') {
        return copy.sort((a, b) =>
          `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US')
        );
      }
      if (sortMode === 'position') {
        return copy.sort((a, b) => {
          const aPosition = a.desiredPosition?.toLowerCase() ?? '';
          const bPosition = b.desiredPosition?.toLowerCase() ?? '';
          if (aPosition && bPosition) {
            const compare = aPosition.localeCompare(bPosition, 'en-US');
            if (compare !== 0) {
              return compare;
            }
          } else if (aPosition || bPosition) {
            return aPosition ? -1 : 1;
          }
          return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US');
        });
      }
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    [list, sortMode]
  );

  const handleCreate = () => {
    setModalCandidate(null);
    setModalBanner(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalCandidate(null);
    setModalBanner(null);
  };

  const handleSave = async (
    profile: CandidateProfile,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => {
    setModalBanner(null);

    const trimmedFirstName = profile.firstName.trim();
    const trimmedLastName = profile.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setModalBanner({ type: 'error', text: 'Заполните обязательные поля: First name и Last name.' });
      return;
    }

    const normalizedProfile: CandidateProfile = {
      ...profile,
      firstName: trimmedFirstName,
      lastName: trimmedLastName
    };

    const result = await saveProfile(normalizedProfile, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setModalBanner({
          type: 'error',
          text: 'Не удалось сохранить: карточку изменили в другой сессии. Обновите список и повторите.'
        });
      } else {
        setModalBanner({
          type: 'error',
          text: 'Не удалось сохранить изменения. Проверьте обязательные поля и попробуйте снова.'
        });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Candidate card saved.' });

    if (options.closeAfterSave) {
      closeModal();
    } else {
      setModalCandidate(result.data);
      setModalBanner({ type: 'info', text: 'Изменения сохранены.' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete the candidate card permanently?');
    if (!confirmed) {
      return;
    }
    const result = await removeProfile(id);
    if (!result.ok) {
      setBanner({ type: 'error', text: 'Failed to delete the candidate.' });
      return;
    }
    setBanner({ type: 'info', text: 'Candidate card deleted.' });
    closeModal();
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Candidate database</h1>
          <p className={styles.subtitle}>Create and edit candidate profiles with AI assistance.</p>
        </div>
        <div className={styles.actions}>
          <label className={styles.sortControl}>
            <span>Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="updated">Last change</option>
              <option value="name">Last name</option>
              <option value="position">Desired position</option>
            </select>
          </label>
          <button className={styles.primaryButton} onClick={handleCreate}>
            Create profile
          </button>
        </div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.cardsGrid}>
        {sortedCandidates.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No candidates yet</h2>
            <p>Use the “Create profile” button to add the first candidate.</p>
          </div>
        ) : (
          sortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              profile={candidate}
              onOpen={() => {
                setModalCandidate(candidate);
                setModalBanner(null);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <CandidateModal
          initialProfile={modalCandidate}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          feedback={modalBanner}
          onFeedbackClear={() => setModalBanner(null)}
        />
      )}
    </section>
  );
};
