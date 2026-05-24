import "dotenv/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { scoreCandidate } from "../src/tools/scoreCandidate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rolesDir = resolve(__dirname, "../knowledge/roles");

const USERNAME = process.argv[2] ?? "Wajkie";
const ROLE = (process.argv[3] ?? "junior-frontend") as "junior-frontend" | "junior-fullstack";
const LIGHTHOUSE = process.argv[4] === "--lighthouse";

const GITHUB_TOKEN = process.env["GITHUB_TOKEN"] ?? "";
const PAGESPEED_API_KEY = process.env["PAGESPEED_API_KEY"] ?? "";

function bar(score: number, width = 30): string {
  const filled = Math.round((score / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function scoreColor(score: number): string {
  if (score >= 70) return "\x1b[32m"; // green
  if (score >= 50) return "\x1b[33m"; // yellow
  return "\x1b[31m";                  // red
}

const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const cyan = "\x1b[36m";
const green = "\x1b[32m";

console.log(`\n${bold}${cyan}╔══════════════════════════════════════════╗`);
console.log(`║          CodeScreen — Candidate Eval     ║`);
console.log(`╚══════════════════════════════════════════╝${reset}\n`);
console.log(`${dim}Scoring ${bold}${USERNAME}${reset}${dim} for ${bold}${ROLE}${reset}${dim}${LIGHTHOUSE ? " with Lighthouse enrichment" : ""}...${reset}\n`);

const start = Date.now();

try {
  const result = await scoreCandidate(USERNAME, ROLE, GITHUB_TOKEN, rolesDir, LIGHTHOUSE, PAGESPEED_API_KEY);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const rec = result.recommendation === "Interview" ? `${green}${bold}✓ Interview${reset}` : `\x1b[31m${bold}✗ Pass${reset}`;
  const col = scoreColor(result.fit_score);

  console.log(`${bold}Candidate:${reset}      ${result.candidate}`);
  console.log(`${bold}Role:${reset}           ${result.role}`);
  console.log(`${bold}Recommendation:${reset} ${rec}`);
  console.log();

  console.log(`${bold}Fit Score:${reset}  ${col}${bold}${result.fit_score}${reset}/100`);
  console.log(`  ${bar(result.fit_score)}  ${col}${result.fit_score}%${reset}`);
  console.log();

  console.log(`${bold}Breakdown:${reset}`);
  for (const [label, key] of [
    ["Trajectory   (45%)", "trajectory"],
    ["Concept Match(35%)", "concept_match"],
    ["Complexity   (20%)", "complexity"],
  ] as const) {
    const val = result.breakdown[key];
    const c = scoreColor(val);
    console.log(`  ${label}  ${bar(val, 20)}  ${c}${val}${reset}`);
  }
  console.log();

  console.log(`${bold}Trajectory:${reset}`);
  console.log(`  ${result.trajectory_summary}`);
  console.log();

  if (result.matched_concepts.length > 0) {
    console.log(`${bold}Matched concepts:${reset}`);
    for (const c of result.matched_concepts) {
      console.log(`  ${green}✓${reset} ${c}`);
    }
    console.log();
  }

  if (result.missing_concepts.length > 0) {
    console.log(`${bold}Missing concepts:${reset}`);
    for (const c of result.missing_concepts) {
      console.log(`  \x1b[31m✗${reset} ${c}`);
    }
    console.log();
  }

  if (result.enrichment) {
    const lh = result.enrichment.lighthouse;
    console.log(`${bold}Lighthouse Enrichment:${reset}  ${lh.live_projects_found} live project(s) found`);

    for (const audit of lh.audits) {
      console.log(`\n  ${cyan}${audit.url}${reset}`);
      for (const [label, key] of [
        ["Performance  ", "performance"],
        ["Accessibility", "accessibility"],
        ["Best Practices", "best_practices"],
        ["SEO          ", "seo"],
      ] as const) {
        const val = audit.scores[key];
        const c = scoreColor(val);
        console.log(`    ${label}  ${bar(val, 15)}  ${c}${val}${reset}`);
      }
      if (audit.wcag_violations.length > 0) {
        console.log(`    ${bold}WCAG violations:${reset}`);
        for (const v of audit.wcag_violations) {
          console.log(`      \x1b[31m⚠${reset}  ${v}`);
        }
      } else {
        console.log(`    ${green}✓ No WCAG violations${reset}`);
      }
    }
    console.log();
  }

  console.log(`${dim}Completed in ${elapsed}s${reset}\n`);
} catch (err) {
  console.error(`\x1b[31mError:${reset}`, err instanceof Error ? err.message : err);
  process.exit(1);
}
