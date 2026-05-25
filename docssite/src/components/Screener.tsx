import { useState } from 'react';

interface Breakdown {
  trajectory: number;
  concept_match: number;
  complexity: number;
}

interface RoleScore {
  role: string;
  role_name: string;
  fit_score: number;
  recommendation: 'Interview' | 'Pass';
  breakdown: Breakdown;
  matched_concepts: string[];
  missing_concepts: string[];
}

interface TrackGroup {
  track: string;
  tiers: RoleScore[];
}

interface CurvePoint {
  period: string;
  repoCount: number;
  avgComplexity: number;
}

interface TrajectoryInfo {
  score: number;
  summary: string;
  curve: CurvePoint[];
}

interface LighthouseScores {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
}

interface UrlAuditResult {
  url: string;
  scores: LighthouseScores;
  wcag_violations: string[];
}

interface LighthouseEnrichment {
  live_projects_found: number;
  audits: UrlAuditResult[];
}

interface AllRolesResult {
  candidate: string;
  best_fit: string;
  roles: RoleScore[];
  tracks: TrackGroup[];
  trajectory: TrajectoryInfo;
  lighthouse?: LighthouseEnrichment;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="screener-score-bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`screener-score-fill${score >= 50 ? ' screener-score-fill--interview' : ''}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function RoleRow({ role, bestFit }: { role: RoleScore; bestFit: string }) {
  const [expanded, setExpanded] = useState(false);
  const tier = capitalize(role.role.split('-')[0] ?? '');
  const isBest = role.role === bestFit;

  return (
    <div className={`screener-role-row${isBest ? ' screener-role-row--best' : ''}`}>
      <button
        type="button"
        className="screener-role-summary"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="screener-tier">{tier}</span>
        <span className="screener-role-name">{role.role_name}</span>
        <ScoreBar score={role.fit_score} />
        <span className="screener-pct">{role.fit_score}%</span>
        <span className={`badge${role.recommendation === 'Interview' ? ' badge--interview' : ' badge--pass'}`}>
          {role.recommendation}
        </span>
        {isBest && <span className="badge badge--best">best fit</span>}
        <span className="screener-chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="screener-role-detail">
          <div className="screener-breakdown">
            <span>Trajectory: <strong>{role.breakdown.trajectory}%</strong></span>
            <span>Concept match: <strong>{role.breakdown.concept_match}%</strong></span>
            <span>Complexity: <strong>{role.breakdown.complexity}%</strong></span>
          </div>
          {role.matched_concepts.length > 0 && (
            <div className="screener-concepts">
              <p className="screener-concepts-label screener-concepts-label--matched">Matched</p>
              <ul className="screener-concept-list">
                {role.matched_concepts.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
          {role.missing_concepts.length > 0 && (
            <div className="screener-concepts">
              <p className="screener-concepts-label screener-concepts-label--missing">Missing</p>
              <ul className="screener-concept-list">
                {role.missing_concepts.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  'pre-grad': 'Pre-grad',
  '12m+': '12m+',
  '6-12m': '6–12m',
  '3-6m': '3–6m',
  '0-3m': '0–3m',
};

function TrajectoryCurve({ trajectory }: { trajectory: TrajectoryInfo }) {
  if (trajectory.curve.length === 0) {
    return (
      <div className="screener-section">
        <p className="screener-section-title">Trajectory</p>
        <p className="screener-section-empty">{trajectory.summary}</p>
      </div>
    );
  }
  return (
    <div className="screener-section">
      <p className="screener-section-title">Trajectory</p>
      <p className="screener-section-summary">{trajectory.summary}</p>
      <div className="traj-chart">
        {trajectory.curve.map(pt => (
          <div key={pt.period} className="traj-row">
            <span className="traj-label">{PERIOD_LABELS[pt.period] ?? pt.period}</span>
            <div className="traj-bar-wrap">
              <div
                className="traj-bar"
                style={{ width: `${pt.avgComplexity}%` }}
                title={`${pt.avgComplexity} avg complexity`}
              />
            </div>
            <span className="traj-value">{pt.avgComplexity}</span>
            <span className="traj-repos">{pt.repoCount} repo{pt.repoCount !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function lhColor(score: number): string {
  if (score >= 90) return 'lh-score--good';
  if (score >= 50) return 'lh-score--ok';
  return 'lh-score--poor';
}

function LighthousePanel({ lighthouse }: { lighthouse: LighthouseEnrichment }) {
  if (lighthouse.audits.length === 0) {
    return (
      <div className="screener-section">
        <p className="screener-section-title">Lighthouse</p>
        <p className="screener-section-empty">No live project URLs found to audit.</p>
      </div>
    );
  }
  return (
    <div className="screener-section">
      <p className="screener-section-title">Lighthouse</p>
      <div className="lh-audits">
        {lighthouse.audits.map(audit => (
          <div key={audit.url} className="lh-audit-card">
            <p className="lh-url">
              <a href={audit.url} target="_blank" rel="noreferrer">{audit.url.replace(/^https?:\/\//, '')}</a>
            </p>
            <div className="lh-scores">
              {(['performance', 'accessibility', 'best_practices', 'seo'] as const).map(key => (
                <div key={key} className={`lh-score ${lhColor(audit.scores[key])}`}>
                  <span className="lh-score-value">{audit.scores[key]}</span>
                  <span className="lh-score-label">{key === 'best_practices' ? 'Best Practices' : capitalize(key)}</span>
                </div>
              ))}
            </div>
            {audit.wcag_violations.length > 0 && (
              <details className="lh-violations">
                <summary className="lh-violations-summary">
                  {audit.wcag_violations.length} accessibility issue{audit.wcag_violations.length !== 1 ? 's' : ''}
                </summary>
                <ul className="screener-concept-list">
                  {audit.wcag_violations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Screener() {
  const [username, setUsername] = useState('');
  const [graduationDate, setGraduationDate] = useState('');
  const [apiUrl, setApiUrl] = useState('http://localhost:3001');
  const [includeLighthouse, setIncludeLighthouse] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AllRolesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const base = apiUrl.replace(/\/$/, '');
      const params = new URLSearchParams();
      if (graduationDate) params.set('graduation_date', graduationDate);
      if (includeLighthouse) params.set('include_lighthouse', 'true');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${base}/check/${encodeURIComponent(name)}${qs}`);
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((data.error as string | undefined) ?? `HTTP ${res.status}`);
      } else {
        setResult(data as unknown as AllRolesResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — is the check server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screener">
      <form className="screener-form" onSubmit={handleSubmit} noValidate>
        <div className="screener-main-row">
          <label className="screener-label" htmlFor="screener-username">
            GitHub username
          </label>
          <div className="screener-input-group">
            <input
              id="screener-username"
              className="screener-input"
              type="text"
              placeholder="e.g. torvalds"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="screener-btn"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Checking…' : 'Check'}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="screener-advanced-toggle"
          onClick={() => setShowAdvanced(s => !s)}
        >
          {showAdvanced ? '▲ hide options' : '▼ options'}
        </button>

        {showAdvanced && (
          <div className="screener-advanced">
            <div className="screener-option-row">
              <label className="screener-label" htmlFor="screener-api-url">
                API URL
              </label>
              <input
                id="screener-api-url"
                className="screener-input screener-input--sm"
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                disabled={loading}
              />
              <p className="screener-hint">
                Address of the check server — set <code>CHECK_PORT</code> to start it.
              </p>
            </div>
            <div className="screener-option-row">
              <label className="screener-label" htmlFor="screener-grad-date">
                Graduation date <span className="screener-optional">(optional)</span>
              </label>
              <input
                id="screener-grad-date"
                className="screener-input screener-input--sm"
                type="date"
                value={graduationDate}
                onChange={e => setGraduationDate(e.target.value)}
                disabled={loading}
              />
              <p className="screener-hint">
                Repos before this date are weighted lower in trajectory scoring.
              </p>
            </div>
            <label className="screener-checkbox-row">
              <input
                type="checkbox"
                checked={includeLighthouse}
                onChange={e => setIncludeLighthouse(e.target.checked)}
                disabled={loading}
              />
              <span>Run Lighthouse audit on live project URLs</span>
              <span className="screener-optional">(requires PAGESPEED_API_KEY — adds ~30s)</span>
            </label>
          </div>
        )}
      </form>

      {error && (
        <div className="callout callout--warning screener-callout">
          {error}
        </div>
      )}

      {loading && (
        <div className="screener-loading" aria-live="polite">
          <span className="screener-spinner" aria-hidden="true" />
          Fetching GitHub profile and scoring all roles…
        </div>
      )}

      {result && (
        <div className="screener-results" aria-live="polite">
          <p className="screener-candidate-link">
            Results for{' '}
            <a href={`https://github.com/${result.candidate}`} target="_blank" rel="noreferrer">
              github.com/{result.candidate}
            </a>
          </p>
          <div className="screener-tracks">
            {result.tracks
              .filter(g => g.tiers.length > 0)
              .map(group => (
                <div key={group.track} className="screener-track-card">
                  <h4 className="screener-track-title">{capitalize(group.track)}</h4>
                  {group.tiers.map(role => (
                    <RoleRow key={role.role} role={role} bestFit={result.best_fit} />
                  ))}
                </div>
              ))}
          </div>
          <TrajectoryCurve trajectory={result.trajectory} />
          {result.lighthouse && <LighthousePanel lighthouse={result.lighthouse} />}
        </div>
      )}
    </div>
  );
}
