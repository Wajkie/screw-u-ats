import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listCandidates, candidatesKeys, type Candidate } from '../api/candidates';
import styles from './Dashboard.module.css';

function RecommendationBadge({ score }: { score: number }) {
  return (
    <span className={score >= 70 ? styles.badgeInterview : styles.badgePass}>
      {score >= 70 ? 'Interview' : 'Pass'}
    </span>
  );
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { latest_report: report } = candidate;
  return (
    <Link to={`/candidates/${candidate.id}`} className={styles.card}>
      <div className={styles.cardName}>
        {candidate.display_name ?? candidate.github_username}
      </div>
      {candidate.display_name && (
        <div className={styles.cardUsername}>@{candidate.github_username}</div>
      )}
      {report ? (
        <div className={styles.cardScore}>
          <span className={styles.scoreValue}>{report.fit_score}</span>
          <span className={styles.scoreRole}>{report.best_fit}</span>
          <RecommendationBadge score={report.fit_score} />
        </div>
      ) : (
        <div className={styles.noReport}>No report yet &mdash;</div>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const { data: candidates, isLoading, isError } = useQuery({
    queryKey: candidatesKeys.all,
    queryFn: listCandidates,
  });

  if (isLoading) return <p>Loading candidates…</p>;
  if (isError) return <p>Failed to load candidates.</p>;

  return (
    <div>
      <h1 className={styles.heading}>Candidates</h1>
      {candidates!.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No candidates yet.</p>
          <Link to="/candidates/new">Add your first candidate →</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {candidates!.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
