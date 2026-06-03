import jsPDF from 'jspdf';
import type { AllRolesResult } from '../api/candidates';
import { conceptLabel, PERIOD_LABELS } from '../pages/report/utils';

function flatConcepts(concepts: AllRolesResult['roles'][0]['matched_concepts']): string[] {
  return concepts.map(conceptLabel);
}

export function buildAIPrompt(r: AllRolesResult): string {
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
    lines.push(group.track.toUpperCase());
    for (const role of group.tiers) {
      const marker = role.role === r.best_fit ? ' ◀ best fit' : '';
      lines.push(`  ${role.role_name}: ${role.fit_score}% (${role.recommendation})${marker}`);
    }
  }
  lines.push('');

  if (best && best.matched_concepts.length > 0) {
    lines.push('--- Matched concepts ---');
    lines.push(flatConcepts(best.matched_concepts).join(', '));
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

  if (r.top_repos_for_review && r.top_repos_for_review.length > 0) {
    lines.push('--- Top repos for review ---');
    for (const repo of r.top_repos_for_review) {
      lines.push(`  ${repo.name} (${repo.repo_url}) — combined ${repo.combined_score}`);
      if (repo.matched_concepts.length > 0)
        lines.push(`    Demonstrated: ${repo.matched_concepts.join(', ')}`);
      if (repo.missing_concepts.length > 0)
        lines.push(`    Missing: ${repo.missing_concepts.join(', ')}`);
    }
    lines.push('');
  }

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

export function downloadAsPDF(r: AllRolesResult): void {
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

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Screening Report', M, y);
  y += 9;

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
      const lines = doc.splitTextToSize(flatConcepts(best.matched_concepts).join(', '), CW);
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
    doc.text(label, M + 3, y);
    doc.text(`avg complexity ${pt.avgComplexity}`, M + 22, y);
    doc.text(`${pt.repoCount} repo${pt.repoCount !== 1 ? 's' : ''}`, M + 70, y);
    y += 4.5;
  }

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
      doc.text(`Performance ${s.performance}   Accessibility ${s.accessibility}   Best Practices ${s.best_practices}   SEO ${s.seo}`, M + 3, y);
      y += 4;
      if (audit.wcag_violations.length > 0) {
        const vLines = doc.splitTextToSize(`WCAG issues: ${audit.wcag_violations.join('; ')}`, CW - 3);
        doc.text(vLines, M + 3, y);
        y += vLines.length * 4;
      }
      y += 2;
    }
  }

  doc.addPage();
  y = 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('AI INSTRUCTIONS — PASTE INTO CLAUDE, CHATGPT, OR SIMILAR', M, y);
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

  doc.save(`staged-${r.candidate}.pdf`);
}
