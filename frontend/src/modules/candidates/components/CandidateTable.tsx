import styles from '../../../styles/CandidatesScreen.module.css';

export interface CandidateTableRow {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number | null;
  city: string;
  desiredPosition: string;
  phone: string;
  email: string;
  totalExperienceYears: number | null;
  updatedAt: string;
  resumeDownload?: { url: string; fileName: string } | null;
  onOpen: () => void;
}

export type CandidateSortKey =
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'age'
  | 'city'
  | 'desiredPosition'
  | 'phone'
  | 'email'
  | 'totalExperience'
  | 'updatedAt';

interface CandidateTableProps {
  rows: CandidateTableRow[];
  sortKey: CandidateSortKey;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: CandidateSortKey) => void;
}

const formatDate = (input: string) => {
  const date = new Date(input);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const SORTABLE_COLUMNS: Array<{
  key: CandidateSortKey;
  title: string;
}> = [
  { key: 'firstName', title: 'First name' },
  { key: 'lastName', title: 'Last name' },
  { key: 'gender', title: 'Gender' },
  { key: 'age', title: 'Age' },
  { key: 'city', title: 'City' },
  { key: 'desiredPosition', title: 'Desired position' },
  { key: 'phone', title: 'Phone' },
  { key: 'email', title: 'Email' },
  { key: 'totalExperience', title: 'Total experience (years)' },
  { key: 'updatedAt', title: 'Last updated' }
];

const getSortLabel = (direction: 'asc' | 'desc') => (direction === 'asc' ? '▲' : '▼');

export const CandidateTable = ({ rows, sortDirection, sortKey, onSortChange }: CandidateTableProps) => {
  if (rows.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.emptyState}>
          <h2>No candidates yet</h2>
          <p>Use the “Create profile” button to add the first candidate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map((column) => {
              const isActive = sortKey === column.key;
              return (
                <th key={column.key}>
                  <button
                    type="button"
                    className={`${styles.sortButton} ${isActive ? styles.sortButtonActive : ''}`}
                    onClick={() => onSortChange(column.key)}
                  >
                    {column.title}
                    {isActive && <span className={styles.sortIcon}>{getSortLabel(sortDirection)}</span>}
                  </button>
                </th>
              );
            })}
            <th>Resume</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.firstName}</td>
              <td>{row.lastName}</td>
              <td>{row.gender}</td>
              <td>{row.age ?? '—'}</td>
              <td>{row.city}</td>
              <td>{row.desiredPosition}</td>
              <td>{row.phone}</td>
              <td>{row.email}</td>
              <td>{row.totalExperienceYears ?? '—'}</td>
              <td>{formatDate(row.updatedAt)}</td>
              <td className={styles.resumeCell}>
                {row.resumeDownload ? (
                  <a
                    className={styles.tableSecondaryButton}
                    href={row.resumeDownload.url}
                    download={row.resumeDownload.fileName}
                  >
                    Download
                  </a>
                ) : (
                  <span className={styles.tableHint}>No resume</span>
                )}
              </td>
              <td className={styles.actionsCell}>
                <button className={styles.tableSecondaryButton} onClick={row.onOpen}>
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
