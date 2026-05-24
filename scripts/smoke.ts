import { fetchRepos } from "../src/github/fetchRepos.js";
import { scoreComplexity, scoreComplexityDetailed } from "../src/scoring/complexitySignals.js";
import { scoreTrajectory } from "../src/scoring/trajectoryScore.js";
import { matchConcepts, parseRoleDefinition } from "../src/scoring/conceptMatch.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const TOKEN = process.env.GITHUB_TOKEN!;
const USERNAME = process.argv[2] ?? "Wajkie";

const __dir = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = join(__dir, "../knowledge/roles");

console.log(`\nFetching repos for ${USERNAME}...\n`);
const repos = await fetchRepos(USERNAME, TOKEN);
console.log(`Found ${repos.length} repos.\n`);

// --- Complexity ---
console.log("=== Complexity per repo ===");
const scored = repos
  .map((r) => ({ name: r.name, score: scoreComplexity(r), detail: scoreComplexityDetailed(r) }))
  .sort((a, b) => b.score - a.score);

for (const { name, score, detail } of scored.slice(0, 10)) {
  console.log(
    `  ${name.padEnd(35)} ${String(score).padStart(3)}/100` +
    `  tests:${detail.hasTests ? "✓" : "·"} ci:${detail.hasCi ? "✓" : "·"} size:${detail.size} deps:${detail.deps} readme:${detail.readme} span:${detail.span}`,
  );
}
if (scored.length > 10) console.log(`  … and ${scored.length - 10} more`);

// --- Trajectory ---
console.log("\n=== Trajectory ===");
const traj = scoreTrajectory(repos);
console.log(`  Score  : ${traj.score}/100`);
console.log(`  Delta  : ${traj.delta ?? "n/a"} (newer − older complexity)`);
console.log(`  Summary: ${traj.summary}`);
console.log("  Buckets:");
for (const [bucket, avg] of Object.entries(traj.bucketAverages)) {
  console.log(`    ${bucket.padEnd(6)} avg complexity: ${avg}`);
}

// --- Concept Match ---
for (const roleFile of ["junior-frontend.md", "junior-fullstack.md"]) {
  const rolePath = join(knowledgeDir, roleFile);
  let roleMarkdown: string;
  try {
    roleMarkdown = readFileSync(rolePath, "utf-8");
  } catch {
    console.log(`\n(skipping ${roleFile} — not found)`);
    continue;
  }
  const role = parseRoleDefinition(roleMarkdown);

  console.log(`\n=== Concept Match — ${role.name} ===`);
  const match = matchConcepts(repos, role);
  console.log(`  Score  : ${match.score}/100`);
  console.log(`  Matched: ${match.matchedConcepts.join(", ") || "(none)"}`);
  console.log(`  Missing: ${match.missingConcepts.join(", ") || "(none)"}`);
  console.log(`  Bonus  : ${match.bonusMatched.join(", ") || "(none)"}`);
}

// --- Combined fit_score preview ---
console.log("\n=== Fit score preview (weights: trajectory 45%, concept 35%, complexity 20%) ===");
const avgComplexity = Math.round(repos.reduce((s, r) => s + scoreComplexity(r), 0) / repos.length);
for (const roleFile of ["junior-frontend.md", "junior-fullstack.md"]) {
  const rolePath = join(knowledgeDir, roleFile);
  let roleMarkdown: string;
  try { roleMarkdown = readFileSync(rolePath, "utf-8"); } catch { continue; }
  const role = parseRoleDefinition(roleMarkdown);
  const conceptScore = matchConcepts(repos, role).score;
  const fitScore = Math.round(traj.score * 0.45 + conceptScore * 0.35 + avgComplexity * 0.20);
  const rec = fitScore >= 50 ? "Interview" : "Pass";
  console.log(`  ${role.name.padEnd(30)} fit: ${fitScore}/100  → ${rec}`);
}
