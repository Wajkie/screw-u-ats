import { useParams, Link } from 'react-router-dom';
import { useOpeningDetail } from '../hooks/useOpeningDetail';
import styles from './OpeningDetail.module.scss';

function ScoreBar({ score }: { score: number }) {
  return (
    <div className={styles.scoreBar} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${styles.scoreFill} ${score >= 50 ? styles.scoreFillGood : ''}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function OpeningDetail() {
  const { id } = useParams<{ id: string }>();
  const { opening, candidates, startSourcing, isSourcing } = useOpeningDetail(id!);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link to="/openings" className={styles.backLink}>← Openings</Link>
          <h1 className={styles.heading}>{opening.title}</h1>
          <div className={styles.meta}>
            <span className={styles.role}>{opening.role_slug}</span>
            <span className={opening.status === 'open' ? styles.badgeOpen : styles.badgeClosed}>
              {opening.status}
            </span>
          </div>
          {opening.description && <p className={styles.description}>{opening.description}</p>}
        </div>
        <button className={styles.sourceBtn} onClick={startSourcing} disabled={isSourcing}>
          {isSourcing ? 'Starting…' : 'Start Sourcing'}
        </button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Sourced candidates</h2>
        {candidates.length === 0 ? (
          <p className={styles.empty}>No candidates yet. Click "Start Sourcing" to find matches on GitHub.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rankCell}>#</th>
                <th className={styles.nameCell}>Candidate</th>
                <th className={styles.roleCell}>Best fit role</th>
                <th className={styles.barCell}>Score</th>
                <th className={styles.scoreCell}>Fit</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={c.id} className={styles.row}>
                  <td className={styles.rankCell}>{i + 1}</td>
                  <td className={styles.nameCell}>
                    <Link to={`/candidates/${c.id}`} className={styles.nameLink}>
                      {c.display_name ?? c.github_username}
                    </Link>
                    {c.display_name && <span className={styles.username}>@{c.github_username}</span>}
                  </td>
                  <td className={styles.roleCell}>{c.best_fit}</td>
                  <td className={styles.barCell}><ScoreBar score={c.fit_score} /></td>
                  <td className={styles.scoreCell}>{c.fit_score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
