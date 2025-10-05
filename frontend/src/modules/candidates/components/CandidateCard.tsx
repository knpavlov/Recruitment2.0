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
      <p className={styles.meta}>{profile.city || 'Город не указан'}</p>
      <p className={styles.position}>{profile.desiredPosition || 'Позиция не указана'}</p>
      {profile.resume && <p className={styles.resume}>Резюме загружено ({profile.resume.fileName})</p>}
    </button>
  );
};
