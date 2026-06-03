import type { TrackGroup } from '../../api/candidates';
import RoleRow from './RoleRow';
import styles from '../ReportDetail.module.scss';

export default function TrackSection({ group, bestFit }: { group: TrackGroup; bestFit: string }) {
  if (group.tiers.length === 0) return null;
  return (
    <div className={styles.trackCard}>
      <h3 className={styles.trackTitle}>{group.track}</h3>
      {group.tiers.map(role => (
        <RoleRow key={role.role} role={role} bestFit={bestFit} />
      ))}
    </div>
  );
}
