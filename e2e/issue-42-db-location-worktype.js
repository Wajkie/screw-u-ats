/**
 * E2E: issue #42 — DB: location, work_type, source fields
 * Runs as a tsx script inside screener-api to access the live DB.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, 'results/issue-42-db-location-worktype.md');
mkdirSync(path.join(__dirname, 'results'), { recursive: true });

const SCRIPT = path.join(__dirname, '../screener-api/src/db/e2e-verify-42.ts');
const RESULTS_JSON = path.join(__dirname, 'results/issue-42-steps.json');

try {
  execSync(`npx tsx "${SCRIPT}" "${RESULTS_JSON}"`, {
    cwd: path.join(__dirname, '../screener-api'),
    stdio: 'inherit',
  });
} catch {
  // steps JSON written even on failure; continue to generate md
}

import { readFileSync } from 'fs';
let steps = [];
try {
  steps = JSON.parse(readFileSync(RESULTS_JSON, 'utf8'));
} catch {
  steps = [{ label: 'run tsx verify script', status: 'FAIL', reason: 'script did not produce output' }];
}

const passed = steps.filter((s) => s.status === 'PASS').length;
const failed = steps.filter((s) => s.status === 'FAIL').length;

const md = [
  '# Issue #42 E2E Results — DB: location, work_type, source fields',
  '',
  `**${passed}/${steps.length} passed** — ${new Date().toISOString()}`,
  '',
  '## Steps',
  ...steps.map((s) =>
    s.status === 'PASS'
      ? `- ✅ ${s.label}`
      : `- ❌ ${s.label}\n  > ${s.reason}`
  ),
].join('\n');

writeFileSync(RESULTS_FILE, md);
console.log(`\n${passed}/${steps.length} passed`);
if (failed > 0) process.exit(1);
