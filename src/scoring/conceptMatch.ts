import { readFileSync } from "fs";
import { resolve } from "path";
import type { GitHubRepo } from "../github/fetchRepos.js";

function loadNpmConceptIndex(): Record<string, string> {
  const rolesDir = process.env.ROLES_DIR ?? resolve(process.cwd(), "knowledge/roles");
  const indexPath = resolve(rolesDir, "..", "npm-concepts.json");
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

const NPM_CONCEPT_INDEX = loadNpmConceptIndex();

export interface RoleDefinition {
  name: string;
  requiredConcepts: string[];
  bonusConcepts: string[];
  minimumComplexityScore: number;
}

export interface ConceptOccurrence {
  concept: string;
  occurrences: number;
}

export interface ConceptMatchResult {
  score: number;
  matchedConcepts: ConceptOccurrence[];
  missingConcepts: string[];
  bonusMatched: ConceptOccurrence[];
}

const STOPWORDS = new Set([
  "and", "and", "or", "with", "in", "the", "a", "an", "of", "for", "to", "from",
  "by", "on", "at", "as", "is", "are", "be", "not", "via", "using", "use",
  "has", "have", "some", "any", "all", "its", "it", "that", "this", "they",
  "their", "more", "than", "just", "both", "only", "also", "vs", "beyond",
]);

function extractTokens(concept: string): string[] {
  return concept
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Insert spaces before "js"/"ts" suffixes so GitHub topic slugs like "nodejs" → "node js",
// letting \bnode\b match, while "javascript" (no such suffix) stays unsplit.
function expandSlug(s: string): string {
  return s.replace(/([a-z]{2,})(js|ts)$/i, "$1 $2");
}

// Strip parenthetical examples before tokenising so "(async/await, closures…)" example tokens
// can't trigger a match independently from the core concept label.
function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, " ").trim();
}

function normalizeLanguage(lang: string): string {
  return lang.replace(/c#/gi, "csharp").replace(/f#/gi, "fsharp").replace(/c\+\+/gi, "cpp");
}

const FRONTEND_FRAMEWORKS = ["react", "vue", "angular", "svelte", "solid", "astro", "preact"];

function depConceptTokens(deps: string[]): string {
  const phrases = new Set<string>();
  for (const dep of deps) {
    for (const [fragment, phrase] of Object.entries(NPM_CONCEPT_INDEX)) {
      if (dep.includes(fragment)) phrases.add(phrase);
    }
  }
  return [...phrases].join(" ");
}

// includeReadme=false for fit scoring (cross-repo aggregate — README noise causes false positives).
// includeReadme=true for per-repo display (single-repo breakdown — README is the main signal).
function buildHaystack(repos: GitHubRepo[], includeReadme = false): string {
  return repos
    .flatMap((r) => {
      const lang = (r.language ?? "").toLowerCase();
      const deps = r.packageDeps.map((d) => d.toLowerCase());
      const hasFrontend = FRONTEND_FRAMEWORKS.some((f) => deps.some((d) => d.includes(f)));
      const hasVueSvelte = deps.some((d) => d.includes("vue") || d.includes("svelte") || d.includes("nuxt"));
      const hasA11yTopic = r.topics.some((t) => t.includes("a11y") || t.includes("accessibility"));

      return [
        normalizeLanguage(r.language ?? ""),
        lang === "typescript" ? "javascript es6" : lang === "javascript" ? "es6" : "",
        hasFrontend ? "html" : "",
        hasFrontend ? "hooks composition component" : "",
        hasFrontend ? "error boundaries fallback" : "",
        hasVueSvelte ? "vue svelte alternative" : "",
        hasA11yTopic ? "accessibility fundamentals" : "",
        r.hasCi ? "git workflow" : "",
        r.hasCi ? "ci cd deployment" : "",
        r.hasCsFiles ? "csharp dotnet" : "",
        r.csprojDeps.length > 0 ? "csharp dotnet" : "",
        depConceptTokens(deps),
        r.description ?? "",
        r.topics.map(expandSlug).join(" "),
        r.packageDeps.map(expandSlug).join(" "),
        r.csprojDeps.join(" "),
        includeReadme ? (r.readmeContent ?? "") : "",
      ];
    })
    .join(" ")
    .toLowerCase();
}

// Supports "key tokens | Human-readable display" format.
// Only the key part is used for matching; the display part is returned in results.
function splitConcept(concept: string): { matchKey: string; display: string } {
  const pipeIdx = concept.indexOf(" | ");
  if (pipeIdx === -1) return { matchKey: concept, display: concept };
  return { matchKey: concept.slice(0, pipeIdx).trim(), display: concept.slice(pipeIdx + 3).trim() };
}

function conceptMatches(matchKey: string, haystack: string): boolean {
  const tokens = extractTokens(stripParens(matchKey));
  if (tokens.length === 0) return false;
  // Require at least 2 tokens to match for multi-token concepts — prevents a single common word
  // (e.g. "async") from satisfying a long concept like "JavaScript ES6+ (async/await…)".
  const threshold = Math.min(2, tokens.length);
  return tokens.filter((t) => new RegExp(`\\b${t}\\b`).test(haystack)).length >= threshold;
}

export function parseRoleDefinition(markdown: string): RoleDefinition {
  const lines = markdown.split("\n");
  let name = "";
  let section = "";
  const requiredConcepts: string[] = [];
  const bonusConcepts: string[] = [];
  let minimumComplexityScore = 0;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      name = line.slice(2).trim();
    } else if (line.startsWith("## ")) {
      section = line.slice(3).trim().toLowerCase();
    } else if (line.startsWith("- ")) {
      const concept = line.slice(2).trim();
      if (section === "required concepts") {
        requiredConcepts.push(concept);
      } else if (section === "bonus concepts") {
        bonusConcepts.push(concept);
      }
    } else {
      const thresholdMatch = line.match(/minimum_complexity_score:\s*(\d+)/);
      if (thresholdMatch) {
        minimumComplexityScore = parseInt(thresholdMatch[1]!, 10);
      }
    }
  }

  return { name, requiredConcepts, bonusConcepts, minimumComplexityScore };
}

export function scoreRepoConceptExposure(repo: GitHubRepo, role: RoleDefinition): { score: number; matched: string[] } {
  const haystack = buildHaystack([repo], true);
  const allConcepts = [...role.requiredConcepts, ...role.bonusConcepts];
  const matched: string[] = [];

  for (const concept of allConcepts) {
    const { matchKey, display } = splitConcept(concept);
    if (conceptMatches(matchKey, haystack)) matched.push(display);
  }

  const score = allConcepts.length === 0 ? 0 : Math.round((matched.length / allConcepts.length) * 100);
  return { score, matched };
}

export function matchConcepts(repos: GitHubRepo[], role: RoleDefinition): ConceptMatchResult {
  const repoHaystacks = repos.map(repo => buildHaystack([repo]));

  const matchedConcepts: ConceptOccurrence[] = [];
  const missingConcepts: string[] = [];
  const bonusMatched: ConceptOccurrence[] = [];

  for (const concept of role.requiredConcepts) {
    const { matchKey, display } = splitConcept(concept);
    const occurrences = repoHaystacks.filter(h => conceptMatches(matchKey, h)).length;
    if (occurrences > 0) {
      matchedConcepts.push({ concept: display, occurrences });
    } else {
      missingConcepts.push(display);
    }
  }

  for (const concept of role.bonusConcepts) {
    const { matchKey, display } = splitConcept(concept);
    const occurrences = repoHaystacks.filter(h => conceptMatches(matchKey, h)).length;
    if (occurrences > 0) {
      bonusMatched.push({ concept: display, occurrences });
    }
  }

  const requiredRatio =
    role.requiredConcepts.length > 0
      ? matchedConcepts.length / role.requiredConcepts.length
      : 1;

  const bonusRatio =
    role.bonusConcepts.length > 0 ? bonusMatched.length / role.bonusConcepts.length : 0;

  const score = Math.round(Math.min(requiredRatio * 80 + bonusRatio * 20, 100));

  return { score, matchedConcepts, missingConcepts, bonusMatched };
}
