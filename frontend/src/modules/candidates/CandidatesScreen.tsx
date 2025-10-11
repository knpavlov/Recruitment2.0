import { useCallback, useMemo, useState } from 'react';
import styles from '../../styles/CandidatesScreen.module.css';
import { CandidateModal } from './components/CandidateModal';
import { CandidateSortKey, CandidateTable, CandidateTableRow } from './components/CandidateTable';
import { useCandidatesState } from '../../app/state/AppStateContext';
import { CandidateProfile } from '../../shared/types/candidate';

const normalizeText = (value?: string | null) => value?.trim() ?? '';

const genderLabels: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  'non-binary': 'Non-binary',
  'prefer-not-to-say': 'Prefer not to say'
};

const getGenderLabel = (code?: string | null) => genderLabels[code ?? ''] ?? 'Not specified';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const CandidatesScreen = () => {
  const { list, saveProfile, removeProfile } = useCandidatesState();
  const [banner, setBanner] = useState<Banner>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<CandidateProfile | null>(null);
  const [modalBanner, setModalBanner] = useState<Banner>(null);
  const [sortKey, setSortKey] = useState<CandidateSortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedCandidates = useMemo(() => {
    const copy = [...list];

    const compareStrings = (a: string, b: string) => a.localeCompare(b, 'en-US', { sensitivity: 'base' });
    const compareNullableNumbers = (a: number | null | undefined, b: number | null | undefined) => {
      const safeA = a ?? Number.NEGATIVE_INFINITY;
      const safeB = b ?? Number.NEGATIVE_INFINITY;
      return safeA - safeB;
    };

    copy.sort((a, b) => {
      let result = 0;

      if (sortKey === 'firstName') {
        result = compareStrings(normalizeText(a.firstName), normalizeText(b.firstName));
      } else if (sortKey === 'lastName') {
        result = compareStrings(normalizeText(a.lastName), normalizeText(b.lastName));
      } else if (sortKey === 'gender') {
        result = compareStrings(getGenderLabel(a.gender), getGenderLabel(b.gender));
      } else if (sortKey === 'age') {
        result = compareNullableNumbers(a.age, b.age);
      } else if (sortKey === 'city') {
        result = compareStrings(normalizeText(a.city), normalizeText(b.city));
      } else if (sortKey === 'desiredPosition') {
        result = compareStrings(normalizeText(a.desiredPosition), normalizeText(b.desiredPosition));
      } else if (sortKey === 'phone') {
        result = compareStrings(normalizeText(a.phone), normalizeText(b.phone));
      } else if (sortKey === 'email') {
        result = compareStrings(normalizeText(a.email), normalizeText(b.email));
      } else if (sortKey === 'totalExperience') {
        result = compareNullableNumbers(a.totalExperienceYears, b.totalExperienceYears);
      } else {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        result = aTime - bTime;
      }

      if (result === 0) {
        result = compareStrings(normalizeText(a.lastName), normalizeText(b.lastName));
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return copy;
  }, [list, sortDirection, sortKey]);

  const handleSortChange = (key: CandidateSortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }
      setSortDirection(key === 'updatedAt' ? 'desc' : 'asc');
      return key;
    });
  };

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

  const tableRows = useMemo<CandidateTableRow[]>(() => {
    return sortedCandidates.map((candidate) => ({
      id: candidate.id,
      firstName: normalizeText(candidate.firstName) || '—',
      lastName: normalizeText(candidate.lastName) || '—',
      gender: getGenderLabel(candidate.gender),
      age: candidate.age ?? null,
      city: normalizeText(candidate.city) || '—',
      desiredPosition: normalizeText(candidate.desiredPosition) || '—',
      phone: normalizeText(candidate.phone) || '—',
      email: normalizeText(candidate.email) || '—',
      totalExperienceYears: candidate.totalExperienceYears ?? null,
      updatedAt: candidate.updatedAt,
      resumeDownload: candidate.resume
        ? { url: candidate.resume.dataUrl, fileName: candidate.resume.fileName }
        : null,
      onOpen: () => openCandidate(candidate)
    }));
  }, [openCandidate, sortedCandidates]);

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
          <button className={styles.primaryButton} onClick={handleCreate}>
            Create profile
          </button>
        </div>
      </header>

      {banner && (
        <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>{banner.text}</div>
      )}

      <CandidateTable rows={tableRows} sortDirection={sortDirection} sortKey={sortKey} onSortChange={handleSortChange} />

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
