import { useParams, Link } from 'react-router-dom';
import { useSourcingJobStream } from '../hooks/useSourcingJobStream';
import styles from './SourcingProgress.module.scss';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  running: 'Searching…',
  done: 'Complete',
  failed: 'Failed',
};

export default function SourcingProgress() {
  const { id, jobId } = useParams<{ id: string; jobId: string }>();
  const { status, usernamesFound, usernamesScored, error } = useSourcingJobStream(jobId!);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Sourcing in progress</h1>

      <div className={styles.statusBox}>
        {(['pending', 'running', 'done', 'failed'] as const).map((s) => (
          <div
            key={s}
            className={[
              styles.step,
              status === s ? styles.stepActive : '',
              status &&
              ['done', 'failed'].includes(status) === false &&
              ['pending', 'running'].indexOf(s) <
                ['pending', 'running'].indexOf(status ?? '')
                ? styles.stepDone
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      {status === 'running' && (
        <div className={styles.counters}>
          <div className={styles.counter}>
            <span className={styles.counterValue}>{usernamesFound}</span>
            <span className={styles.counterLabel}>users found</span>
          </div>
          <div className={styles.counter}>
            <span className={styles.counterValue}>{usernamesScored}</span>
            <span className={styles.counterLabel}>scored</span>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className={styles.doneBox}>
          <p className={styles.doneMessage}>
            Found {usernamesFound} candidates, scored {usernamesScored}.
          </p>
          <Link to={`/openings/${id!}`} className={styles.doneLink}>
            View ranked results →
          </Link>
        </div>
      )}

      {status === 'failed' && (
        <div className={styles.errorBox}>
          <p className={styles.errorMessage}>{error ?? 'Sourcing failed.'}</p>
          <Link to={`/openings/${id!}`} className={styles.backLink}>
            ← Back to opening
          </Link>
        </div>
      )}

      {!status && (
        <p className={styles.connecting}>Connecting…</p>
      )}
    </div>
  );
}
