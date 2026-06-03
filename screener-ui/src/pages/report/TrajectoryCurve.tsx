import type { TrajectoryInfo } from '../../api/candidates';
import { PERIOD_LABELS } from './utils';
import styles from '../ReportDetail.module.scss';

export default function TrajectoryCurve({ trajectory }: { trajectory: TrajectoryInfo }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Trajectory</h2>
      <p className={styles.trajSummary}>{trajectory.summary}</p>
      {trajectory.curve.length > 0 && (
        <div className={styles.trajChart}>
          {trajectory.curve.map(pt => (
            <div key={pt.period} className={styles.trajRow}>
              <span className={styles.trajLabel}>{PERIOD_LABELS[pt.period] ?? pt.period}</span>
              <div className={styles.trajBarWrap}>
                <div
                  className={styles.trajBar}
                  style={{ width: `${pt.avgComplexity}%` }}
                  title={`${pt.avgComplexity} avg complexity`}
                />
              </div>
              <span className={styles.trajValue}>{pt.avgComplexity}</span>
              <span className={styles.trajRepos}>{pt.repoCount} repo{pt.repoCount !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
