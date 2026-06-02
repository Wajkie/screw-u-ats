/**
 * E2E: issue #43 — MCP: activity signal computation
 * Imports the compiled activitySignal module and verifies all 6 fields.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(__dirname, 'results'), { recursive: true });
const RESULTS_FILE = path.join(__dirname, 'results/issue-43-activity-signal.md');

const { computeActivitySignal } = await import('../dist/scoring/activitySignal.js');

const NOW = new Date('2026-06-03T00:00:00Z').getTime();
function daysAgo(d) {
  return new Date(NOW - d * 86_400_000).toISOString();
}
function makeRepo(overrides = {}) {
  return {
    name: 'repo', language: null, isFork: false,
    createdAt: daysAgo(365), pushedAt: daysAgo(30),
    topics: [], description: null, homepage: null,
    stargazersCount: 0, readmeContent: null, hasTests: false,
    hasCi: false, size: 0, defaultBranch: 'main',
    hasAppRouter: false, hasHooksDir: false, hasLibDir: false,
    hasActionsDir: false, hasCsFiles: false,
    packageDeps: [], csprojDeps: [], highlights: [],
    ...overrides,
  };
}

const steps = [];

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  steps.push({ label, status: pass ? 'PASS' : 'FAIL', actual, expected });
}

// 1. Empty list
const empty = computeActivitySignal([], NOW);
check('empty list → last_pushed_at=""', empty.last_pushed_at, '');
check('empty list → all zeros', [empty.repos_last_90d, empty.repos_last_180d, empty.total_original_repos, empty.account_age_months], [0, 0, 0, 0]);
check('empty list → is_recently_active=false', empty.is_recently_active, false);

// 2. All six fields present
const repos = [makeRepo({ pushedAt: daysAgo(20), createdAt: daysAgo(400) })];
const result = computeActivitySignal(repos, NOW);
const allFields = ['last_pushed_at','repos_last_90d','repos_last_180d','total_original_repos','account_age_months','is_recently_active'];
check('all 6 fields present', allFields.every(f => f in result), true);

// 3. 90/180 day window counts
const mixed = [
  makeRepo({ pushedAt: daysAgo(30) }),   // 90d + 180d
  makeRepo({ pushedAt: daysAgo(100) }),  // 180d only
  makeRepo({ pushedAt: daysAgo(200) }),  // neither
];
const w = computeActivitySignal(mixed, NOW);
check('repos_last_90d = 1', w.repos_last_90d, 1);
check('repos_last_180d = 2', w.repos_last_180d, 2);
check('is_recently_active = true', w.is_recently_active, true);

// 4. Fork exclusion
const forks = [
  makeRepo({ isFork: false }),
  makeRepo({ isFork: true }),
  makeRepo({ isFork: false }),
];
check('total_original_repos excludes forks', computeActivitySignal(forks, NOW).total_original_repos, 2);

// 5. All forks
check('all forks → total_original_repos=0', computeActivitySignal([makeRepo({ isFork: true })], NOW).total_original_repos, 0);

// 6. last_pushed_at is the most recent push
const dates = [
  makeRepo({ pushedAt: daysAgo(60) }),
  makeRepo({ pushedAt: daysAgo(5) }),
  makeRepo({ pushedAt: daysAgo(120) }),
];
check('last_pushed_at = most recent', computeActivitySignal(dates, NOW).last_pushed_at, daysAgo(5));

// 7. account_age_months from oldest createdAt
const aged = [
  makeRepo({ createdAt: daysAgo(365) }),
  makeRepo({ createdAt: daysAgo(730) }),
];
// 730 / 30.44 ≈ 23
check('account_age_months ≈ 23 for 730 days', computeActivitySignal(aged, NOW).account_age_months, 23);

// Summary
const passed = steps.filter(s => s.status === 'PASS').length;
const failed = steps.filter(s => s.status === 'FAIL').length;

const lines = [
  '# Issue #43 E2E Results — MCP: activity signal computation',
  '',
  `**${passed}/${steps.length} passed** — ${new Date().toISOString()}`,
  '',
  '## Steps',
  '',
  ...steps.map(s =>
    `- [${s.status === 'PASS' ? 'x' : ' '}] **${s.label}**` +
    (s.status === 'FAIL' ? `\n  - expected: \`${JSON.stringify(s.expected)}\`, got: \`${JSON.stringify(s.actual)}\`` : '')
  ),
];
writeFileSync(RESULTS_FILE, lines.join('\n') + '\n');
console.log(`${passed}/${steps.length} passed`);
if (failed > 0) process.exit(1);
