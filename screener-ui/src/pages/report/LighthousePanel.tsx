import type { LighthouseEnrichment } from '../../api/candidates';
import { lhColorClass } from './utils';
import styles from '../ReportDetail.module.scss';

export default function LighthousePanel({ lighthouse }: { lighthouse: LighthouseEnrichment }) {
  if (lighthouse.audits.length === 0) {
    const msg = lighthouse.live_projects_found > 0
      ? 'Lighthouse audits failed — check your PAGESPEED_API_KEY.'
      : 'No live project URLs found to audit.';
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Lighthouse</h2>
        <p className={styles.empty}>{msg}</p>
      </section>
    );
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Lighthouse</h2>
      <div className={styles.lhAudits}>
        {lighthouse.audits.map(audit => (
          <div key={audit.url} className={styles.lhCard}>
            <p className={styles.lhUrl}>
              <a href={audit.url} target="_blank" rel="noreferrer">
                {audit.url.replace(/^https?:\/\//, '')}
              </a>
            </p>
            <div className={styles.lhScores}>
              {(['performance', 'accessibility', 'best_practices', 'seo'] as const).map(key => (
                <div key={key} className={`${styles.lhScore} ${lhColorClass(audit.scores[key], styles)}`}>
                  <span className={styles.lhScoreValue}>{audit.scores[key]}</span>
                  <span className={styles.lhScoreLabel}>
                    {key === 'best_practices' ? 'Best Practices' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            {audit.wcag_violations.length > 0 && (
              <details className={styles.lhViolations}>
                <summary className={styles.lhViolationsSummary}>
                  {audit.wcag_violations.length} accessibility issue{audit.wcag_violations.length !== 1 ? 's' : ''}
                </summary>
                <ul className={styles.conceptList}>
                  {audit.wcag_violations.map((v, i) => <li key={i} className={styles.conceptItem}>{v}</li>)}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
