import type { RepoReviewCard, RepoAudit } from '../../api/candidates';
import { a11yBadgeClass } from './utils';
import styles from '../ReportDetail.module.scss';

function buildAuditMap(audits: RepoAudit[]): Map<string, RepoAudit> {
  const map = new Map<string, RepoAudit>();
  for (const a of audits) map.set(a.url, a);
  return map;
}

export default function TopReposForReview({
  repos,
  audits = [],
}: {
  repos: RepoReviewCard[];
  audits?: RepoAudit[];
}) {
  if (repos.length === 0) return null;
  const auditMap = buildAuditMap(audits);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Top repos for review</h2>
      <div className={styles.reviewList}>
        {repos.map(repo => {
          const audit = repo.homepage_url ? auditMap.get(repo.homepage_url) : undefined;
          return (
            <div key={repo.name} className={styles.reviewCard}>
              <div className={styles.reviewCardHeader}>
                <a href={repo.repo_url} target="_blank" rel="noreferrer" className={styles.reviewRepoName}>
                  {repo.name}
                </a>
                <div className={styles.reviewScores}>
                  <div className={`${styles.reviewScoreChip} ${styles.reviewScoreChipCombined}`}>
                    <span className={styles.reviewScoreVal}>{repo.combined_score}</span>
                    <span className={styles.reviewScoreLabel}>combined</span>
                  </div>
                  <div className={styles.reviewScoreChip}>
                    <span className={styles.reviewScoreVal}>{repo.complexity_score}</span>
                    <span className={styles.reviewScoreLabel}>complexity</span>
                  </div>
                  <div className={styles.reviewScoreChip}>
                    <span className={styles.reviewScoreVal}>{repo.concept_score}</span>
                    <span className={styles.reviewScoreLabel}>concept</span>
                  </div>
                  {audit && (
                    <div className={`${styles.reviewScoreChip} ${a11yBadgeClass(audit.accessibility_score, styles)}`}>
                      <span className={styles.reviewScoreVal}>{audit.accessibility_score}</span>
                      <span className={styles.reviewScoreLabel}>a11y</span>
                    </div>
                  )}
                </div>
              </div>
              {repo.matched_concepts.length > 0 && (
                <div className={styles.reviewConcepts}>
                  {repo.matched_concepts.map(c => (
                    <span key={c} className={styles.reviewConceptTag}>{c}</span>
                  ))}
                </div>
              )}
              {repo.missing_concepts.length > 0 && (
                <div className={styles.reviewConcepts}>
                  {repo.missing_concepts.map(c => (
                    <span key={c} className={`${styles.reviewConceptTag} ${styles.reviewConceptTagMissing}`}>{c}</span>
                  ))}
                </div>
              )}
              {repo.highlights.length > 0 && (
                <div className={styles.reviewHighlights}>
                  {repo.highlights.map(h => (
                    <span key={h.signal} className={styles.reviewHighlight}>
                      <a href={h.url} target="_blank" rel="noreferrer">{h.signal}</a>
                    </span>
                  ))}
                </div>
              )}
              {audit && audit.wcag_violations.length > 0 && (
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
          );
        })}
      </div>
    </section>
  );
}
