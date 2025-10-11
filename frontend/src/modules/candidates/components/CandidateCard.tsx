import { CandidateProfile } from '../../../shared/types/candidate';
import styles from '../../../styles/CandidateCard.module.css';

interface CandidateCardProps {
  profile: CandidateProfile;
  onOpen: () => void;
}

export const CandidateCard = ({ profile, onOpen }: CandidateCardProps) => {
  const updatedAt = new Date(profile.updatedAt);
  const formattedUpdate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(updatedAt);

  return (
    <button className={styles.card} onClick={onOpen}>
      <h3>
        {profile.firstName} {profile.lastName}
      </h3>
      <p className={styles.meta}>{profile.city || 'City not specified'}</p>
      <p className={styles.position}>{profile.desiredPosition || 'Position not specified'}</p>
      <p className={styles.updated}>last updated on {formattedUpdate}</p>
    </button>
  );
};
