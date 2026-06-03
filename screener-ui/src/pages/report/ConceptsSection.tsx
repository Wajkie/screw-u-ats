import type { RoleScore } from '../../api/candidates';
import { conceptLabel, conceptCount } from './utils';
import styles from '../ReportDetail.module.scss';

export default function ConceptsSection({ role }: { role: RoleScore }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Concepts — {role.role_name}</h2>
      <div className={styles.conceptsGrid}>
        {role.matched_concepts.length > 0 && (
          <div className={styles.conceptGroup}>
            <p className={`${styles.conceptLabel} ${styles.conceptLabelMatched}`}>Matched</p>
            <ul className={styles.conceptList}>
              {role.matched_concepts.map(c => (
                <li key={conceptLabel(c)} className={styles.conceptItem}>
                  {conceptLabel(c)}
                  {conceptCount(c) !== null && (
                    <span className={styles.occurrenceBadge}>{conceptCount(c)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {role.missing_concepts.length > 0 && (
          <div className={styles.conceptGroup}>
            <p className={`${styles.conceptLabel} ${styles.conceptLabelMissing}`}>Missing</p>
            <ul className={styles.conceptList}>
              {role.missing_concepts.map(c => (
                <li key={c} className={styles.conceptItem}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
