import { Hono } from 'hono';
import { loadRoleSlugs } from './roles.repository.js';
import { listLatestReportsAllCandidates } from '../reports/reports.repository.js';
import type { AllRolesResult, RoleSlug } from '../../../src/tools/scoreAllRoles.js';

const roles = new Hono();

roles.get('/', (c) => {
  return c.json(loadRoleSlugs());
});

roles.get('/:role/candidates', async (c) => {
  const role = c.req.param('role');
  if (!loadRoleSlugs().includes(role)) {
    return c.json({ error: 'Unknown role' }, 400);
  }

  const latestReports = await listLatestReportsAllCandidates();

  const results = latestReports
    .map(row => {
      const data = JSON.parse(row.data) as AllRolesResult;
      const roleScore = data.roles.find(r => r.role === (role as RoleSlug));
      if (!roleScore) return null;
      return {
        candidate_id: row.candidate_id,
        github_username: row.github_username,
        display_name: row.display_name,
        report_id: row.id,
        report_created_at: row.created_at,
        fit_score: roleScore.fit_score,
        recommendation: roleScore.recommendation,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.fit_score - a.fit_score);

  return c.json(results);
});

export { roles };
