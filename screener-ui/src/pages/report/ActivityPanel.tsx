import type { ActivitySignal } from '../../api/candidates';
import styles from '../ReportDetail.module.scss';

function formatAccountAge(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return `${years} yr${years !== 1 ? 's' : ''}`;
  }
  return `${months} mo`;
}

export default function ActivityPanel({ activity }: { activity: ActivitySignal }) {
  const lastPushed = activity.last_pushed_at
    ? new Date(activity.last_pushed_at).toLocaleDateString()
    : '—';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Activity</h2>
      <div className={styles.activityGrid}>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Last active</span>
          <span className={styles.activityValue}>{lastPushed}</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Active repos (90d)</span>
          <span className={styles.activityValue}>{activity.repos_last_90d}</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Active repos (180d)</span>
          <span className={styles.activityValue}>{activity.repos_last_180d}</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Original repos</span>
          <span className={styles.activityValue}>{activity.total_original_repos}</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Account age</span>
          <span className={styles.activityValue}>{formatAccountAge(activity.account_age_months)}</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>Status</span>
          <span className={activity.is_recently_active ? styles.activityBadgeActive : styles.activityBadgeInactive}>
            {activity.is_recently_active ? 'Recently active' : 'Inactive'}
          </span>
        </div>
      </div>
    </section>
  );
}
