import { useCallback, useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateTable, CandidateTableRow } from './components/CandidateTable';
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

  const openCandidate = useCallback((candidate: CandidateProfile) => {
    setModalCandidate(candidate);
    setModalBanner(null);
    setIsModalOpen(true);
  }, []);

  const tableRows = useMemo<CandidateTableRow[]>(
    () =>
      sortedCandidates.map((candidate) => ({
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`.trim() || 'Unnamed candidate',
        desiredPosition: candidate.desiredPosition?.trim() || '—',
        city: candidate.city?.trim() || '—',
        updatedAt: candidate.updatedAt,
        onOpen: () => openCandidate(candidate)
      })),
    [openCandidate, sortedCandidates]
  );

  const handleSave = async (
    profile: CandidateProfile,
    options: { closeAfterSave: boolean; expectedVersion: number | null }
  ) => {
    setModalBanner(null);

    const trimmedFirstName = profile.firstName.trim();
    const trimmedLastName = profile.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setModalBanner({ type: 'error', text: 'Fill in the required fields: First name and Last name.' });
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
          text: 'Could not save: the profile was updated in another session. Refresh the list and try again.'
        });
      } else {
        setModalBanner({
          type: 'error',
          text: 'Failed to save changes. Check the required fields and try again.'
        });
      }
      return;
    }

    setBanner({ type: 'info', text: 'Candidate card saved.' });

    if (options.closeAfterSave) {
      closeModal();
    } else {
      setModalCandidate(result.data);
      setModalBanner({ type: 'info', text: 'Changes saved.' });
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

      <CandidateTable rows={tableRows} />

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
