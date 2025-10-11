import styles from '../../../styles/CandidatesScreen.module.css';

export interface CandidateTableRow {
  id: string;
  name: string;
  desiredPosition: string;
  city: string;
  updatedAt: string;
  onOpen: () => void;
}

interface CandidateTableProps {
  rows: CandidateTableRow[];
}

const formatDate = (input: string) => {
  const date = new Date(input);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const CandidateTable = ({ rows }: CandidateTableProps) => {
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
            <th>Name</th>
            <th>Desired position</th>
            <th>City</th>
            <th>Last updated</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.desiredPosition}</td>
              <td>{row.city}</td>
              <td>{formatDate(row.updatedAt)}</td>
              <td className={styles.actionsCell}>
                <button className={styles.tableSecondaryButton} onClick={row.onOpen}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
