import { useState } from 'react';
import jsPDF from 'jspdf';
import CopyButton from './CopyButton';

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

const PERIOD_LABELS: Record<string, string> = {
  'pre-grad': 'Pre-grad',
  '12m+': '12m+',
  '6-12m': '6–12m',
  '3-6m': '3–6m',
  '0-3m': '0–3m',
};

function buildAIPrompt(r: AllRolesResult): string {
  const best = r.roles.find(ro => ro.role === r.best_fit) ?? r.roles[0];
  const lines: string[] = [];

  lines.push('=== CANDIDATE SCREENING REPORT ===');
  lines.push(`Candidate: github.com/${r.candidate}`);
  lines.push(`Best-fit role: ${best?.role_name ?? r.best_fit}`);
  lines.push(`Fit score: ${best?.fit_score ?? '—'}%`);
  lines.push(`Recommendation: ${best?.recommendation ?? '—'}`);
  lines.push('');

  lines.push('--- Pillar Breakdown ---');
  if (best) {
    lines.push(`  Trajectory:     ${best.breakdown.trajectory}%`);
    lines.push(`  Concept match:  ${best.breakdown.concept_match}%`);
    lines.push(`  Complexity:     ${best.breakdown.complexity}%`);
  }
  lines.push('');

  lines.push('--- Skill Map (all roles) ---');
  for (const group of r.tracks) {
    if (group.tiers.length === 0) continue;
    lines.push(`${group.track.toUpperCase()}`);
    for (const role of group.tiers) {
      const marker = role.role === r.best_fit ? ' ◀ best fit' : '';
      lines.push(`  ${role.role_name}: ${role.fit_score}% (${role.recommendation})${marker}`);
    }
  }
  lines.push('');

  if (best && best.matched_concepts.length > 0) {
    lines.push('--- Matched concepts ---');
    lines.push(best.matched_concepts.join(', '));
    lines.push('');
  }

  if (best && best.missing_concepts.length > 0) {
    lines.push('--- Missing concepts ---');
    lines.push(best.missing_concepts.join(', '));
    lines.push('');
  }

  lines.push('--- Trajectory curve ---');
  lines.push(r.trajectory?.summary ?? '');
  for (const pt of r.trajectory?.curve ?? []) {
    const label = PERIOD_LABELS[pt.period] ?? pt.period;
    lines.push(`  ${label}: avg complexity ${pt.avgComplexity}, ${pt.repoCount} repo(s)`);
  }
  lines.push('');

  if (r.lighthouse && r.lighthouse.audits.length > 0) {
    lines.push('--- Lighthouse scores ---');
    for (const audit of r.lighthouse.audits) {
      lines.push(`  ${audit.url}`);
      const s = audit.scores;
      lines.push(`    Performance ${s.performance}  Accessibility ${s.accessibility}  Best Practices ${s.best_practices}  SEO ${s.seo}`);
      if (audit.wcag_violations.length > 0) {
        lines.push(`    WCAG issues: ${audit.wcag_violations.join('; ')}`);
      }
    }
    lines.push('');
  }

  lines.push('=== AI INSTRUCTIONS ===');
  lines.push('You are a technical recruiter assistant. Using the screening report above:');
  lines.push('1. Summarise the candidate\'s strengths in 2–3 sentences.');
  lines.push('2. Identify the most significant skill gaps and explain their practical impact.');
  lines.push('3. Suggest 3–5 targeted interview questions that probe the gap areas.');
  lines.push('4. Give a plain-language verdict: should the recruiter proceed to interview? Why or why not?');
  lines.push('Keep the response concise and recruiter-friendly — avoid jargon.');

  return lines.join('\n');
}

function downloadAsPDF(r: AllRolesResult): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 20;
  const CW = W - M * 2;
  let y = 22;

  const best = r.roles.find(ro => ro.role === r.best_fit) ?? r.roles[0];
  const exportDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  function newPageIfNeeded(needed = 14): void {
    if (y + needed > H - 15) { doc.addPage(); y = 20; }
  }

  // ── Title ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Screening Report', M, y);
  y += 9;

  // ── Metadata ──
  const meta: [string, string][] = [
    ['Candidate', `github.com/${r.candidate}`],
    ['Date', exportDate],
    ['Best-fit role', best?.role_name ?? r.best_fit],
    ['Recommendation', best?.recommendation ?? '—'],
  ];
  doc.setFontSize(10);
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.text(k, M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, M + 38, y);
    y += 5.5;
  }
  y += 2;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── Skill Map ──
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Skill Map', M, y);
  y += 7;

  for (const group of r.tracks) {
    if (group.tiers.length === 0) continue;
    newPageIfNeeded(6 + group.tiers.length * 5.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120);
    doc.text(group.track.toUpperCase(), M, y);
    doc.setTextColor(0);
    y += 4;

    for (const role of group.tiers) {
      const tier = capitalize(role.role.split('-')[0] ?? '');
      const isBest = role.role === r.best_fit;

      doc.setFontSize(9);
      doc.setFont('helvetica', isBest ? 'bold' : 'normal');
      doc.setTextColor(isBest ? 0 : 70);
      doc.text(tier, M + 3, y);
      doc.text(role.role_name, M + 18, y);
      doc.text(`${role.fit_score}%`, M + 105, y, { align: 'right' });
      doc.text(role.recommendation, M + 110, y);
      doc.setTextColor(0);
      y += 5.5;
    }
    y += 2;
  }

  // ── Best-fit breakdown ──
  if (best) {
    newPageIfNeeded(30);
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Breakdown: ${best.role_name}`, M, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Trajectory ${best.breakdown.trajectory}%    Concept match ${best.breakdown.concept_match}%    Complexity ${best.breakdown.complexity}%`,
      M, y,
    );
    y += 6;

    if (best.matched_concepts.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Matched:', M, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(best.matched_concepts.join(', '), CW);
      newPageIfNeeded(lines.length * 4 + 2);
      doc.text(lines, M, y);
      y += lines.length * 4 + 3;
    }

    if (best.missing_concepts.length > 0) {
      newPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Missing:', M, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(best.missing_concepts.join(', '), CW);
      newPageIfNeeded(lines.length * 4 + 2);
      doc.text(lines, M, y);
      y += lines.length * 4 + 3;
    }
  }

  // ── Trajectory ──
  newPageIfNeeded(20);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Trajectory', M, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(r.trajectory?.summary ?? '', CW);
  doc.text(summaryLines, M, y);
  y += summaryLines.length * 5 + 2;

  for (const pt of r.trajectory?.curve ?? []) {
    newPageIfNeeded(5);
    const label = PERIOD_LABELS[pt.period] ?? pt.period;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, M + 3, y);
    doc.text(`avg complexity ${pt.avgComplexity}`, M + 22, y);
    doc.text(`${pt.repoCount} repo${pt.repoCount !== 1 ? 's' : ''}`, M + 70, y);
    y += 4.5;
  }

  // ── Lighthouse (if present) ──
  if (r.lighthouse && r.lighthouse.audits.length > 0) {
    newPageIfNeeded(20);
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Lighthouse', M, y);
    y += 6;

    for (const audit of r.lighthouse.audits) {
      newPageIfNeeded(18);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(audit.url.replace(/^https?:\/\//, ''), M, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      const s = audit.scores;
      doc.text(
        `Performance ${s.performance}   Accessibility ${s.accessibility}   Best Practices ${s.best_practices}   SEO ${s.seo}`,
        M + 3, y,
      );
      y += 4;
      if (audit.wcag_violations.length > 0) {
        const vLines = doc.splitTextToSize(`WCAG issues: ${audit.wcag_violations.join('; ')}`, CW - 3);
        doc.text(vLines, M + 3, y);
        y += vLines.length * 4;
      }
      y += 2;
    }
  }

  // ── AI Instructions (new page) ──
  doc.addPage();
  y = 20;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('AI INSTRUCTIONS — PASTE INTO CHATGPT, CLAUDE, OR SIMILAR', M, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Copy everything below and paste it into your AI assistant of choice.', M, y);
  doc.setTextColor(0);
  y += 7;

  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  const aiLines = doc.splitTextToSize(buildAIPrompt(r), CW);
  for (const line of aiLines) {
    newPageIfNeeded(4);
    doc.text(line, M, y);
    y += 3.8;
  }

  doc.save(`codescreen-${r.candidate}.pdf`);
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
    const msg = lighthouse.live_projects_found > 0
      ? 'Lighthouse audits failed — check your PAGESPEED_API_KEY.'
      : 'No live project URLs found to audit.';
    return (
      <div className="screener-section">
        <p className="screener-section-title">Lighthouse</p>
        <p className="screener-section-empty">{msg}</p>
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
          <div className="screener-results-header">
            <p className="screener-candidate-link">
              Results for{' '}
              <a href={`https://github.com/${result.candidate}`} target="_blank" rel="noreferrer">
                github.com/{result.candidate}
              </a>
            </p>
            <div className="screener-export-buttons">
              <CopyButton text={buildAIPrompt(result)} label="Copy prompt" copiedLabel="Copied!" />
              <button type="button" className="copy-btn" onClick={() => downloadAsPDF(result)}>
                Download PDF
              </button>
            </div>
          </div>
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
          {result.trajectory && <TrajectoryCurve trajectory={result.trajectory} />}
          {result.lighthouse && <LighthousePanel lighthouse={result.lighthouse} />}
        </div>
      )}
    </div>
  );
}
