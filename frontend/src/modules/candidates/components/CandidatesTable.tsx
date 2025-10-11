import styles from '../../../styles/CandidatesTable.module.css';

export interface CandidatesTableRow {
  id: string;
  displayName: string;
  desiredPosition: string;
  city: string;
  updatedAtLabel: string;
}

interface CandidatesTableProps {
  rows: CandidatesTableRow[];
  onOpen: (id: string) => void;
}

export const CandidatesTable = ({ rows, onOpen }: CandidatesTableProps) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Desired position</th>
            <th>City</th>
            <th>Last update</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.displayName}</td>
              <td>{row.desiredPosition}</td>
              <td>{row.city}</td>
              <td>{row.updatedAtLabel}</td>
              <td className={styles.actionsCell}>
                <button className={styles.primaryButton} onClick={() => onOpen(row.id)} type="button">
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
