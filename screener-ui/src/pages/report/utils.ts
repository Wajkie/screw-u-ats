import type { MatchedConcept } from '../../api/candidates';

export const PERIOD_LABELS: Record<string, string> = {
  'pre-grad': 'Pre-grad',
  '12m+': '12m+',
  '6-12m': '6–12m',
  '3-6m': '3–6m',
  '0-3m': '0–3m',
};

export function conceptLabel(c: MatchedConcept): string {
  return typeof c === 'string' ? c : c.concept;
}

export function conceptCount(c: MatchedConcept): number | null {
  return typeof c === 'object' ? c.occurrences : null;
}

export function lhColorClass(score: number, s: Record<string, string>): string {
  if (score >= 90) return s.lhGood;
  if (score >= 50) return s.lhOk;
  return s.lhPoor;
}
