import { useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateCard } from './components/CandidateCard';
import { useCandidatesState } from '../../app/state/AppStateContext';
import { CandidateProfile } from '../../shared/types/candidate';
import { DomainResult } from '../../shared/types/results';

type Banner = { type: 'info' | 'error'; text: string } | null;

type SortMode = 'updated' | 'name' | 'position';

export const CandidatesScreen = () => {
  const { list, saveProfile, removeProfile } = useCandidatesState();
  const [banner, setBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<CandidateProfile | null>(null);
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
    setIsModalOpen(true);
  };

  const handleSave = async (
    profile: CandidateProfile,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ): Promise<DomainResult<CandidateProfile>> => {
    const result = await saveProfile(profile, options.expectedVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        setBanner({
          type: 'error',
          text: 'Changes not saved: the record was updated by another user. Refresh the page.'
        });
      } else if (result.error !== 'invalid-input') {
        setBanner({ type: 'error', text: 'Failed to save the candidate. Try again later.' });
      }
      return result;
    }

    setBanner({ type: 'info', text: 'Candidate card saved.' });

    if (options.closeAfterSave) {
      setIsModalOpen(false);
    } else {
      setModalCandidate(result.data);
    }
    return result;
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
        <div className={styles.actions}>
          <label className={styles.sortControl}>
            <span>Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="updated">Last change</option>
              <option value="name">Last Name</option>
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
