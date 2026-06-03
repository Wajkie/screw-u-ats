import type { GitHubRepo } from "../github/fetchRepos.js";

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
const CSS_DEPS = ["sass", "postcss", "tailwindcss", "styled-components", "@emotion", "less"];

// includeReadme=false for fit scoring (cross-repo aggregate — README noise causes false positives).
// includeReadme=true for per-repo display (single-repo breakdown — README is the main signal).
const ROUTER_DEPS = ["react-router", "tanstack-router", "wouter", "reach-router", "vue-router", "svelte-kit"];
const STATE_DEPS = ["zustand", "redux", "jotai", "recoil", "mobx", "nanostores", "xstate", "pinia"];
const HTTP_DEPS = ["axios", "swr", "react-query", "@tanstack/react-query", "react-query", "ky", "ofetch"];

// includeReadme=false for fit scoring (cross-repo aggregate — README noise causes false positives).
// includeReadme=true for per-repo display (single-repo breakdown — README is the main signal).
function buildHaystack(repos: GitHubRepo[], includeReadme = false): string {
  return repos
    .flatMap((r) => {
      const lang = (r.language ?? "").toLowerCase();
      const deps = r.packageDeps.map((d) => d.toLowerCase());
      const hasFrontend = FRONTEND_FRAMEWORKS.some((f) => deps.some((d) => d.includes(f)));
      const hasCss = hasFrontend || CSS_DEPS.some((f) => deps.some((d) => d.includes(f)));
      const hasRouter = ROUTER_DEPS.some((f) => deps.some((d) => d.includes(f)));
      const hasStateLib = STATE_DEPS.some((s) => deps.some((d) => d.includes(s)));
      const hasHttpLib = HTTP_DEPS.some((s) => deps.some((d) => d.includes(s)));
      const hasVite = deps.some((d) => d.includes("vite"));
      const hasBuildTool = hasVite || deps.some((d) => ["webpack", "esbuild", "parcel", "turbopack", "rollup"].some((b) => d.includes(b)));
      const hasTestLib = deps.some((d) => ["vitest", "jest", "mocha", "jasmine", "cypress", "playwright", "testing-library"].some((t) => d.includes(t)));

      return [
        normalizeLanguage(r.language ?? ""),
        // TypeScript is a strict superset of ES6+ JavaScript — both tokens must be findable.
        // Plain JavaScript repos already emit "javascript" via the language field; add "es6".
        lang === "typescript" ? "javascript es6" : lang === "javascript" ? "es6" : "",
        // Frontend frameworks render HTML; any React/Vue/etc. project implies HTML authoring
        hasFrontend ? "html" : "",
        // Component-based projects always involve CSS (modules, sass, or plain stylesheets)
        hasCss ? "css" : "",
        // Synthetic concept tokens — derived from deps so README exclusion doesn't break matching.
        // Each phrase maps to tokens that appear in the corresponding role concept label.
        hasFrontend ? "hooks composition components" : "",
        hasRouter ? "routing" : "",
        hasStateLib ? "state management" : "",
        hasHttpLib ? "rest api integration" : "",
        hasBuildTool ? "build tooling" : "",
        hasTestLib ? "testing" : "",
        r.hasCsFiles ? "csharp dotnet" : "",
        r.csprojDeps.length > 0 ? "csharp dotnet" : "",
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
