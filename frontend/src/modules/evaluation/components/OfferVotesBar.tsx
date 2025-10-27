import styles from '../../../styles/OfferVotesBar.module.css';

export interface OfferVotesData {
  yesPriority: number;
  yesStrong: number;
  yesKeepWarm: number;
  noOffer: number;
}

interface OfferVotesBarProps {
  votes: OfferVotesData;
}

const SEGMENT_LABELS: Record<keyof OfferVotesData, string> = {
  yesPriority: 'Yes, priority',
  yesStrong: 'Yes, meets the high bar',
  yesKeepWarm: 'Turndown, stay in contact',
  noOffer: 'Turndown'
};

export const OfferVotesBar = ({ votes }: OfferVotesBarProps) => {
  const segments = [
    { key: 'yesPriority' as const, value: votes.yesPriority, className: styles.segmentPriority },
    { key: 'yesStrong' as const, value: votes.yesStrong, className: styles.segmentStrong },
    { key: 'yesKeepWarm' as const, value: votes.yesKeepWarm, className: styles.segmentKeepWarm },
    { key: 'noOffer' as const, value: votes.noOffer, className: styles.segmentNoOffer }
  ];

  const total = segments.reduce((acc, segment) => acc + segment.value, 0);

  if (total === 0) {
    return <span className={styles.empty}>—</span>;
  }

  const summary = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const percentage = Math.round((segment.value / total) * 100);
      return `${SEGMENT_LABELS[segment.key]} — ${segment.value}/${total} (${percentage}%)`;
    })
    .join(' · ');

  return (
    <div className={styles.wrapper} role="group" aria-label={`Offer votes: ${summary}`}>
      <div className={styles.bar} aria-hidden="true">
        {segments.map((segment) => {
          if (segment.value <= 0) {
            return null;
          }

          const percentage = Math.round((segment.value / total) * 100);
          const title = `${SEGMENT_LABELS[segment.key]} — ${segment.value}/${total} (${percentage}%)`;
          return (
            <div
              key={segment.key}
              className={`${styles.segment} ${segment.className}`}
              style={{ flexGrow: segment.value }}
              title={title}
            >
              {percentage >= 18 ? <span className={styles.segmentLabel}>{percentage}%</span> : null}
            </div>
          );
        })}
      </div>
      <span className={styles.caption}>{total} vote{total === 1 ? '' : 's'}</span>
    </div>
  );
};
