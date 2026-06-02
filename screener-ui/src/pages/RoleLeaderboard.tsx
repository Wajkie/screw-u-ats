import { useParams, Link } from 'react-router-dom';
import { useRoleLeaderboard } from '../hooks/useRoleLeaderboard';
import type { RoleLeaderboardEntry } from '../api/candidates';
import styles from './RoleLeaderboard.module.scss';

function ScoreBar({ score }: { score: number }) {
  return (
    <div className={styles.scoreBar} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${styles.scoreFill} ${score >= 50 ? styles.scoreFillInterview : ''}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function Badge({ score }: { score: number }) {
  const isInterview = score >= 50;
  return (
    <span className={isInterview ? styles.badgeInterview : styles.badgePass}>
      {isInterview ? 'Interview' : 'Pass'}
    </span>
  );
}

function LeaderboardRow({ entry, rank }: { entry: RoleLeaderboardEntry; rank: number }) {
  const name = entry.display_name ?? entry.github_username;
  return (
    <tr className={styles.row}>
      <td className={styles.rankCell}>{rank}</td>
      <td className={styles.nameCell}>
        <Link to={`/candidates/${entry.candidate_id}`} className={styles.nameLink}>{name}</Link>
        {entry.display_name && <span className={styles.username}>@{entry.github_username}</span>}
      </td>
      <td className={styles.barCell}><ScoreBar score={entry.fit_score} /></td>
      <td className={styles.scoreCell}>{entry.fit_score}%</td>
      <td className={styles.badgeCell}><Badge score={entry.fit_score} /></td>
    </tr>
  );
}

export default function RoleLeaderboard() {
  const { role } = useParams<{ role: string }>();
  const { roles, data, isLoading, isError, is400, navigateTo } = useRoleLeaderboard(role);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Role Leaderboard</h1>
        <select
          className={styles.roleSelect}
          value={role}
          onChange={(e) => navigateTo(e.target.value)}
          aria-label="Select role"
          disabled={roles.length === 0}
        >
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {is400 && <div className={styles.errorState}><p>Unknown role: <strong>{role}</strong></p></div>}
      {!is400 && isLoading && <p>Loading…</p>}
      {!is400 && isError && <p className={styles.errorState}>Failed to load leaderboard.</p>}
      {!is400 && data?.length === 0 && (
        <div className={styles.emptyState}>
          <p>No candidates have been analyzed against <strong>{role}</strong> yet.</p>
          <Link to="/candidates/new">Add a candidate →</Link>
        </div>
      )}
      {!is400 && data && data.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCell}>#</th>
              <th className={styles.nameCell}>Candidate</th>
              <th className={styles.barCell}>Score</th>
              <th className={styles.scoreCell}>Fit</th>
              <th className={styles.badgeCell}>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, i) => <LeaderboardRow key={entry.candidate_id} entry={entry} rank={i + 1} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}
