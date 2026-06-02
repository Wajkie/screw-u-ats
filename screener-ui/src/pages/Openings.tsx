import { Link } from 'react-router-dom';
import { listOpenings, openingsKeys, type Opening } from '../api/openings';
import { useApiQuery } from '../hooks/useApiQuery';
import styles from './Openings.module.scss';

function StatusBadge({ status }: { status: Opening['status'] }) {
  return (
    <span className={status === 'open' ? styles.badgeOpen : styles.badgeClosed}>
      {status}
    </span>
  );
}

function OpeningCard({ opening }: { opening: Opening }) {
  return (
    <Link to={`/openings/${opening.id}`} className={styles.card}>
      <div className={styles.cardTitle}>{opening.title}</div>
      <div className={styles.cardRole}>{opening.role_slug}</div>
      <div className={styles.cardMeta}>
        <StatusBadge status={opening.status} />
        <span className={styles.cardCount}>
          {opening.candidate_count} candidate{opening.candidate_count !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}

export default function Openings() {
  const { data: openings } = useApiQuery(openingsKeys.all, listOpenings);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Openings</h1>
        <Link to="/openings/new" className={styles.newButton}>New Opening</Link>
      </div>
      {openings.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No openings yet.</p>
          <Link to="/openings/new">Create your first opening →</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {openings.map((o) => (
            <OpeningCard key={o.id} opening={o} />
          ))}
        </div>
      )}
    </div>
  );
}
