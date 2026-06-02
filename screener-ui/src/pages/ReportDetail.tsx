import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getReport,
  candidatesKeys,
  type RoleScore,
  type TrackGroup,
  type TrajectoryInfo,
  type LighthouseEnrichment,
  type MatchedConcept,
} from '../api/candidates';
import styles from './ReportDetail.module.scss';

const PERIOD_LABELS: Record<string, string> = {
  'pre-grad': 'Pre-grad',
  '12m+': '12m+',
  '6-12m': '6–12m',
  '3-6m': '3–6m',
  '0-3m': '0–3m',
};

function conceptLabel(c: MatchedConcept): string {
  return typeof c === 'string' ? c : c.concept;
}

function conceptCount(c: MatchedConcept): number | null {
  return typeof c === 'object' ? c.occurrences : null;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className={styles.scoreBar}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${styles.scoreFill} ${score >= 50 ? styles.scoreFillInterview : ''}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function Badge({ recommendation }: { recommendation: 'Interview' | 'Pass' }) {
  return (
    <span className={recommendation === 'Interview' ? styles.badgeInterview : styles.badgePass}>
      {recommendation}
    </span>
  );
}

function RoleRow({ role, bestFit }: { role: RoleScore; bestFit: string }) {
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
        <Badge recommendation={role.recommendation} />
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

function TrackCard({ group, bestFit }: { group: TrackGroup; bestFit: string }) {
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

function TrajectoryCurve({ trajectory }: { trajectory: TrajectoryInfo }) {
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

function lhColorClass(score: number, s: typeof styles): string {
  if (score >= 90) return s.lhGood;
  if (score >= 50) return s.lhOk;
  return s.lhPoor;
}

function LighthousePanel({ lighthouse }: { lighthouse: LighthouseEnrichment }) {
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

export default function ReportDetail() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>();

  const reportQuery = useQuery({
    queryKey: candidatesKeys.report(reportId!),
    queryFn: () => getReport(reportId!),
  });

  if (reportQuery.isLoading) return <p>Loading…</p>;
  if (reportQuery.isError) return <p>Failed to load report.</p>;

  const report = reportQuery.data!;
  const data = report.data;
  const bestRole = data.roles.find(r => r.role === data.best_fit);
  const recommendation = bestRole?.recommendation ?? (bestRole && bestRole.fit_score >= 50 ? 'Interview' : 'Pass');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.backLink}>
            <Link to={`/candidates/${id}`}>← Back to candidate</Link>
          </div>
          <h1 className={styles.heading}>
            <a
              href={`https://github.com/${data.candidate}`}
              target="_blank"
              rel="noreferrer"
              className={styles.ghLink}
            >
              {data.candidate}
            </a>
          </h1>
          <div className={styles.meta}>
            {new Date(report.created_at).toLocaleString()} · Best fit: <strong>{data.best_fit}</strong>
          </div>
        </div>
        {recommendation && (
          <Badge recommendation={recommendation as 'Interview' | 'Pass'} />
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Role fit by track</h2>
        <div className={styles.tracks}>
          {data.tracks.map(group => (
            <TrackCard key={group.track} group={group} bestFit={data.best_fit} />
          ))}
        </div>
      </section>

      <TrajectoryCurve trajectory={data.trajectory} />

      {data.lighthouse && <LighthousePanel lighthouse={data.lighthouse} />}

      {bestRole && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Concepts — {bestRole.role_name}</h2>
          <div className={styles.conceptsGrid}>
            {bestRole.matched_concepts.length > 0 && (
              <div className={styles.conceptGroup}>
                <p className={`${styles.conceptLabel} ${styles.conceptLabelMatched}`}>Matched</p>
                <ul className={styles.conceptList}>
                  {bestRole.matched_concepts.map(c => (
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
            {bestRole.missing_concepts.length > 0 && (
              <div className={styles.conceptGroup}>
                <p className={`${styles.conceptLabel} ${styles.conceptLabelMissing}`}>Missing</p>
                <ul className={styles.conceptList}>
                  {bestRole.missing_concepts.map(c => (
                    <li key={c} className={styles.conceptItem}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}