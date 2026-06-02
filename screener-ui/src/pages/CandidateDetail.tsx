import { useParams, Link } from 'react-router-dom';
import { useCandidateDetail } from '../hooks/useCandidateDetail';
import FitHistoryChart from '../components/FitHistoryChart';
import styles from './CandidateDetail.module.scss';

function RecommendationBadge({ score }: { score: number }) {
  return (
    <span className={score >= 70 ? styles.badgeInterview : styles.badgePass}>
      {score >= 70 ? 'Interview' : 'Pass'}
    </span>
  );
}

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const { candidate, reports, fitHistory, startAnalysis, isAnalyzing } = useCandidateDetail(id!);

  const latest = candidate.latest_report;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>
            {candidate.display_name ?? candidate.github_username}
          </h1>
          {candidate.display_name && (
            <div className={styles.username}>@{candidate.github_username}</div>
          )}
          {candidate.graduation_date && (
            <div className={styles.meta}>Graduated: {candidate.graduation_date}</div>
          )}
          {candidate.notes && (
            <div className={styles.notes}>{candidate.notes}</div>
          )}
        </div>
        <button className={styles.analyzeBtn} onClick={startAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? 'Starting…' : 'Re-analyze'}
        </button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Latest report</h2>
        {latest ? (
          <div className={styles.latestReport}>
            <span className={styles.score}>{latest.fit_score}</span>
            <span className={styles.role}>{latest.best_fit}</span>
            <RecommendationBadge score={latest.fit_score} />
            <Link to={`/candidates/${id}/reports/${latest.id}`} className={styles.viewLink}>
              View →
            </Link>
          </div>
        ) : (
          <p className={styles.empty}>No reports yet. Click Re-analyze to run the first analysis.</p>
        )}
      </section>

      {fitHistory && fitHistory.length > 1 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Score over time</h2>
          <FitHistoryChart history={fitHistory} />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>History</h2>
        {reports.length === 0 ? (
          <p className={styles.empty}>No snapshots yet.</p>
        ) : (
          <ul className={styles.historyList}>
            {reports.map((r) => (
              <li key={r.id} className={styles.historyItem}>
                <Link to={`/candidates/${id}/reports/${r.id}`} className={styles.historyLink}>
                  <span className={styles.historyDate}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span className={styles.historyScore}>{r.fit_score}</span>
                  <span className={styles.historyRole}>{r.best_fit}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
