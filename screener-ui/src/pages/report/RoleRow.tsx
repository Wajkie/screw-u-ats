import { useState } from 'react';
import type { RoleScore } from '../../api/candidates';
import RecommendationBadge from '../../components/RecommendationBadge';
import ScoreBar from './ScoreBar';
import { conceptLabel, conceptCount } from './utils';
import styles from '../ReportDetail.module.scss';

export default function RoleRow({ role, bestFit }: { role: RoleScore; bestFit: string }) {
  const [expanded, setExpanded] = useState(false);
  const tier = (role.role.split('-')[0] ?? '').replace(/^\w/, c => c.toUpperCase());
  const isBest = role.role === bestFit;

  return (
    <div className={`${styles.roleRow} ${isBest ? styles.roleRowBest : ''}`}>
      <button
        type="button"
        className={styles.roleSummary}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className={styles.tier}>{tier}</span>
        <span className={styles.roleName}>{role.role_name}</span>
        <ScoreBar score={role.fit_score} />
        <span className={styles.pct}>{role.fit_score}%</span>
        <RecommendationBadge recommendation={role.recommendation} />
        {isBest && <span className={styles.badgeBest}>best fit</span>}
        <span className={styles.chevron} aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className={styles.roleDetail}>
          <div className={styles.breakdown}>
            <span>Trajectory: <strong>{role.breakdown.trajectory}%</strong></span>
            <span>Concept match: <strong>{role.breakdown.concept_match}%</strong></span>
            <span>Complexity: <strong>{role.breakdown.complexity}%</strong></span>
          </div>
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
                {role.missing_concepts.map(c => <li key={c} className={styles.conceptItem}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
