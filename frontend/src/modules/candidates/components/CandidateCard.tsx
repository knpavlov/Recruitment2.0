import { CandidateProfile } from '../../../shared/types/candidate';
import styles from '../../../styles/CandidateCard.module.css';

interface CandidateCardProps {
  profile: CandidateProfile;
  onOpen: () => void;
}

export const CandidateCard = ({ profile, onOpen }: CandidateCardProps) => {
  return (
    <button className={styles.card} onClick={onOpen}>
      <h3>
        {profile.firstName} {profile.lastName}
      </h3>
      <p className={styles.meta}>{profile.city || 'City not specified'}</p>
      <p className={styles.position}>{profile.desiredPosition || 'Position not specified'}</p>
      {profile.resume && <p className={styles.resume}>Resume uploaded ({profile.resume.fileName})</p>}
    </button>
  );
};
