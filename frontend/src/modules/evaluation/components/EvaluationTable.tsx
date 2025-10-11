import styles from '../../../styles/EvaluationTable.module.css';

export interface EvaluationTableRow {
  id: string;
  candidateName: string;
  candidatePosition: string;
  roundNumber?: number;
  formsCompleted: number;
  formsTotal: number;
  averageFitScore: number | null;
  averageCaseScore: number | null;
}

interface EvaluationTableProps {
  rows: EvaluationTableRow[];
  onEdit: (id: string) => void;
  onOpenStatus: (id: string) => void;
}

export const EvaluationTable = ({ rows, onEdit, onOpenStatus }: EvaluationTableProps) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Desired position</th>
            <th>Round</th>
            <th>Forms</th>
            <th>Avg fit score</th>
            <th>Avg case score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.candidateName}</td>
              <td>{row.candidatePosition}</td>
              <td>{typeof row.roundNumber === 'number' ? `Round ${row.roundNumber}` : '—'}</td>
              <td>
                {row.formsCompleted}/{row.formsTotal}
              </td>
              <td>{typeof row.averageFitScore === 'number' ? row.averageFitScore.toFixed(1) : '—'}</td>
              <td>{typeof row.averageCaseScore === 'number' ? row.averageCaseScore.toFixed(1) : '—'}</td>
              <td className={styles.actionsCell}>
                <button className={styles.secondaryButton} onClick={() => onEdit(row.id)} type="button">
                  Edit
                </button>
                <button className={styles.primaryButton} onClick={() => onOpenStatus(row.id)} type="button">
                  Status
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
