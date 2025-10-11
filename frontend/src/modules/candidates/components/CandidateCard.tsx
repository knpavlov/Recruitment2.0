import { CandidateProfile } from '../../../shared/types/candidate';
import styles from '../../../styles/CandidateCard.module.css';

interface CandidateCardProps {
  profile: CandidateProfile;
  onOpen: () => void;
}

export const CandidateCard = ({ profile, onOpen }: CandidateCardProps) => {
  const formatUpdatedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Last updated recently';
    }
    return `Last updated on ${date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}`;
  };

  return (
    <button className={styles.card} onClick={onOpen}>
      <h3>
        {profile.firstName} {profile.lastName}
      </h3>
      <p className={styles.meta}>{profile.city || 'City not specified'}</p>
      <p className={styles.position}>{profile.desiredPosition || 'Position not specified'}</p>
      <p className={styles.timestamp}>{formatUpdatedAt(profile.updatedAt)}</p>
    </button>
  );
};
