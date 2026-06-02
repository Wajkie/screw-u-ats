import type { GitHubRepo } from "../github/repoTypes.js";

export interface ActivitySignal {
  last_pushed_at: string;
  repos_last_90d: number;
  repos_last_180d: number;
  total_original_repos: number;
  account_age_months: number;
  is_recently_active: boolean;
}

export function computeActivitySignal(repos: GitHubRepo[], now = Date.now()): ActivitySignal {
  if (repos.length === 0) {
    return {
      last_pushed_at: "",
      repos_last_90d: 0,
      repos_last_180d: 0,
      total_original_repos: 0,
      account_age_months: 0,
      is_recently_active: false,
    };
  }

  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const ms180 = 180 * 24 * 60 * 60 * 1000;

  let latestPush = 0;
  let reposLast90d = 0;
  let reposLast180d = 0;
  let totalOriginalRepos = 0;
  let oldestCreated = Infinity;

  for (const repo of repos) {
    const pushed = new Date(repo.pushedAt).getTime();
    const created = new Date(repo.createdAt).getTime();

    if (pushed > latestPush) latestPush = pushed;
    if (now - pushed <= ms90) reposLast90d++;
    if (now - pushed <= ms180) reposLast180d++;
    if (!(repo.isFork ?? false)) totalOriginalRepos++;
    if (created < oldestCreated) oldestCreated = created;
  }

  const accountAgeMonths =
    oldestCreated === Infinity
      ? 0
      : Math.floor((now - oldestCreated) / (30.44 * 24 * 60 * 60 * 1000));

  return {
    last_pushed_at: new Date(latestPush).toISOString(),
    repos_last_90d: reposLast90d,
    repos_last_180d: reposLast180d,
    total_original_repos: totalOriginalRepos,
    account_age_months: accountAgeMonths,
    is_recently_active: reposLast90d > 0,
  };
}
