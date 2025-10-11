import { useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidatesTable, CandidatesTableRow } from './components/CandidatesTable';
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedCandidates = useMemo(() => {
    const copy = [...list];

    copy.sort((a, b) => {
      if (sortMode === 'name') {
        const compare = `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`,
          'en-US',
          { sensitivity: 'base' }
        );
        return sortDirection === 'asc' ? compare : -compare;
      }

      if (sortMode === 'position') {
        const aPosition = a.desiredPosition?.trim().toLowerCase() ?? '';
        const bPosition = b.desiredPosition?.trim().toLowerCase() ?? '';
        const compare = aPosition.localeCompare(bPosition, 'en-US');
        if (compare !== 0) {
          return sortDirection === 'asc' ? compare : -compare;
        }
        const fallback = `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`,
          'en-US',
          { sensitivity: 'base' }
        );
        return sortDirection === 'asc' ? fallback : -fallback;
      }

      const updatedDiff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDirection === 'asc' ? updatedDiff : -updatedDiff;
    });

    return copy;
  }, [list, sortDirection, sortMode]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
    []
  );

  const tableRows = useMemo<CandidatesTableRow[]>(() => {
    return sortedCandidates.map((candidate) => ({
      id: candidate.id,
      displayName: `${candidate.firstName} ${candidate.lastName}`.trim(),
      desiredPosition: candidate.desiredPosition?.trim() || 'Position not specified',
      city: candidate.city?.trim() || 'City not specified',
      updatedAtLabel: dateFormatter.format(new Date(candidate.updatedAt))
    }));
  }, [dateFormatter, sortedCandidates]);

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
          <button
            className={styles.sortToggle}
            onClick={() => setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}
            type="button"
          >
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
          <button className={styles.primaryButton} onClick={handleCreate}>
            Create profile
          </button>
        </div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <div className={styles.contentArea}>
        {tableRows.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No candidates yet</h2>
            <p>Use the “Create profile” button to add the first candidate.</p>
          </div>
        ) : (
          <CandidatesTable
            rows={tableRows}
            onOpen={(id) => {
              const candidate = list.find((item) => item.id === id);
              if (candidate) {
                setModalCandidate(candidate);
                setModalBanner(null);
                setIsModalOpen(true);
              }
            }}
          />
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
