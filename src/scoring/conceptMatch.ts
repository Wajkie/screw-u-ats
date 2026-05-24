import type { GitHubRepo } from "../github/fetchRepos.js";

export interface RoleDefinition {
  name: string;
  requiredConcepts: string[];
  bonusConcepts: string[];
  minimumComplexityScore: number;
}

export interface ConceptMatchResult {
  score: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  bonusMatched: string[];
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

function buildHaystack(repos: GitHubRepo[]): string {
  return repos
    .flatMap((r) => [
      r.language ?? "",
      r.readmeContent ?? "",
      r.description ?? "",
      r.topics.join(" "),
      r.packageDeps.join(" "),
    ])
    .join(" ")
    .toLowerCase();
}

function conceptMatches(concept: string, haystack: string): boolean {
  const tokens = extractTokens(concept);
  return tokens.length > 0 && tokens.some((t) => haystack.includes(t));
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

export function matchConcepts(repos: GitHubRepo[], role: RoleDefinition): ConceptMatchResult {
  const haystack = buildHaystack(repos);

  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];
  const bonusMatched: string[] = [];

  for (const concept of role.requiredConcepts) {
    if (conceptMatches(concept, haystack)) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  for (const concept of role.bonusConcepts) {
    if (conceptMatches(concept, haystack)) {
      bonusMatched.push(concept);
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
