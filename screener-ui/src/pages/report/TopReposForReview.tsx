import type { RepoReviewCard } from '../../api/candidates';
import styles from '../ReportDetail.module.scss';

export default function TopReposForReview({ repos }: { repos: RepoReviewCard[] }) {
  if (repos.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Top repos for review</h2>
      <div className={styles.reviewList}>
        {repos.map(repo => (
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
          </div>
        ))}
      </div>
    </section>
  );
}
