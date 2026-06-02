import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJobStream } from '../hooks/useJobStream';
import styles from './JobStatus.module.css';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  running: 'Analyzing…',
  done: 'Complete',
  failed: 'Failed',
};

export default function JobStatus() {
  const { id, jobId } = useParams<{ id: string; jobId: string }>();
  const navigate = useNavigate();
  const { status, reportId, error } = useJobStream(jobId!);

  useEffect(() => {
    if (status === 'done' && reportId) {
      void navigate(`/candidates/${id}/reports/${reportId}`, { replace: true });
    }
  }, [status, reportId, id, navigate]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Analysis in progress</h1>

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

      {status === 'failed' && (
        <div className={styles.errorBox}>
          <p className={styles.errorMessage}>{error ?? 'Analysis failed.'}</p>
          <Link to={`/candidates/${id}`} className={styles.backLink}>
            ← Back to candidate
          </Link>
        </div>
      )}

      {!status && (
        <p className={styles.connecting}>Connecting…</p>
      )}
    </div>
  );
}
