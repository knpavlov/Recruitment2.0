import { useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateCard } from './components/CandidateCard';
import { useCandidatesState } from '../../app/state/AppStateContext';
import { CandidateProfile } from '../../shared/types/candidate';

type Banner = { type: 'info' | 'error'; text: string } | null;
type SortOption = 'updated' | 'name' | 'position';

export const CandidatesScreen = () => {
  const { list, saveProfile, removeProfile } = useCandidatesState();
  const [banner, setBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<CandidateProfile | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('updated');

  const sortedCandidates = useMemo(
    () => {
      const copy = [...list];
      switch (sortOption) {
        case 'name':
          return copy.sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US'));
        case 'position':
          return copy.sort((a, b) => {
            const positionA = a.desiredPosition?.toLowerCase() ?? '';
            const positionB = b.desiredPosition?.toLowerCase() ?? '';
            const compare = positionA.localeCompare(positionB, 'en-US');
            if (compare !== 0) {
              return compare;
            }
            return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US');
          });
        case 'updated':
        default:
          return copy.sort((a, b) => {
            const timeA = new Date(a.updatedAt).getTime();
            const timeB = new Date(b.updatedAt).getTime();
            if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
              return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US');
            }
            if (Number.isNaN(timeA)) {
              return 1;
            }
            if (Number.isNaN(timeB)) {
              return -1;
            }
            if (timeA !== timeB) {
              return timeB - timeA;
            }
            return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'en-US');
          });
      }
    },
    [list, sortOption]
  );

  const handleCreate = () => {
    setModalCandidate(null);
    setIsModalOpen(true);
  };

  const handleSave = async (
    profile: CandidateProfile,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => {
    const result = await saveProfile(profile, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setBanner({
          type: 'error',
          text: 'Changes not saved: the record was updated by another user. Refresh the page.'
        });
      } else {
        setBanner({ type: 'error', text: 'Check that all required fields are filled.' });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Candidate card saved.' });

    if (options.closeAfterSave) {
      setIsModalOpen(false);
    } else {
      setModalCandidate(result.data);
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
    setIsModalOpen(false);
    setModalCandidate(null);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Candidate database</h1>
          <p className={styles.subtitle}>Create and edit candidate profiles with AI assistance.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          Create profile
        </button>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.controls}>
        <label className={styles.sortLabel}>
          <span>Sort by</span>
          <select
            className={styles.sortSelect}
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
          >
            <option value="updated">Last updated</option>
            <option value="name">Name</option>
            <option value="position">Desired position</option>
          </select>
        </label>
      </div>

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
