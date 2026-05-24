import "dotenv/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { scoreAllRoles } from "../src/tools/scoreAllRoles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rolesDir = resolve(__dirname, "../knowledge/roles");

const USERNAME = process.argv[2] ?? "Wajkie";
const GITHUB_TOKEN = process.env["GITHUB_TOKEN"] ?? "";

const bold = "\x1b[1m";
const dim = "\x1b[2m";
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const reset = "\x1b[0m";

function scoreColor(score: number): string {
  if (score >= 70) return green;
  if (score >= 50) return yellow;
  return red;
}

console.log(`\n${bold}${cyan}╔══════════════════════════════════════════╗`);
console.log(`║       CodeScreen — All Roles Eval        ║`);
console.log(`╚══════════════════════════════════════════╝${reset}\n`);
console.log(`${dim}Scoring ${bold}${USERNAME}${reset}${dim} against all roles...${reset}\n`);

const start = Date.now();

try {
  const result = await scoreAllRoles(USERNAME, GITHUB_TOKEN, rolesDir);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(result.chart);
  console.log();

  for (const role of result.roles) {
    const isBest = role.role === result.best_fit;
    const col = scoreColor(role.fit_score);
    const rec = role.recommendation === "Interview"
      ? `${green}${bold}✓ Interview${reset}`
      : `${red}${bold}✗ Pass${reset}`;

    console.log(`${bold}${isBest ? cyan : ""}${role.role_name}${reset}${isBest ? `  ${cyan}← best fit${reset}` : ""}`);
    console.log(`  Recommendation: ${rec}   Fit: ${col}${bold}${role.fit_score}${reset}/100`);

    if (role.matched_concepts.length > 0) {
      console.log(`  ${green}Matched:${reset} ${role.matched_concepts.join(", ")}`);
    }
    if (role.missing_concepts.length > 0) {
      console.log(`  ${red}Missing:${reset} ${role.missing_concepts.join(", ")}`);
    }
    console.log();
  }

  console.log(`${dim}Completed in ${elapsed}s${reset}\n`);
} catch (err) {
  console.error(`${red}Error:${reset}`, err instanceof Error ? err.message : err);
  process.exit(1);
}
