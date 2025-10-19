import styles from '../../../styles/AnalyticsScreen.module.css';
import { InterviewerSummary } from '../types';

interface InterviewerStatsTableProps {
  summaries: InterviewerSummary[];
}

const formatNumber = (value: number) => value.toLocaleString('ru-RU');

const formatAverage = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(1);
};

export const InterviewerStatsTable = ({ summaries }: InterviewerStatsTableProps) => {
  if (!summaries.length) {
    return <div className={styles.emptyTable}>Выберите интервьюеров для анализа</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.statsTable}>
        <thead>
          <tr>
            <th>Интервьюер</th>
            <th>Интервью за неделю</th>
            <th>Интервью за месяц</th>
            <th>Интервью за квартал</th>
            <th>Средний кейс</th>
            <th>Средний фит</th>
            <th>Hire рекомендации</th>
            <th>Reject рекомендации</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((item) => (
            <tr key={item.id}>
              <td>
                <div className={styles.personCell}>
                  <span className={styles.personName}>{item.name}</span>
                  <span className={styles.personEmail}>{item.email}</span>
                </div>
              </td>
              <td>{formatNumber(item.weeklyInterviews)}</td>
              <td>{formatNumber(item.monthlyInterviews)}</td>
              <td>{formatNumber(item.quarterlyInterviews)}</td>
              <td>{formatAverage(item.caseScoreAverage)}</td>
              <td>{formatAverage(item.fitScoreAverage)}</td>
              <td>{formatNumber(item.hireRecommendations)}</td>
              <td>{formatNumber(item.rejectRecommendations)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
