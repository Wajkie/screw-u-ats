import type { GitHubRepo } from "./fetchRepos.js";

export function extractLiveUrls(repos: GitHubRepo[]): string[] {
  const seen = new Set<string>();

  for (const repo of repos) {
    const hp = repo.homepage;
    if (hp && hp.startsWith("http")) {
      const normalized = hp.replace(/\/$/, "");
      seen.add(normalized);
    }
  }

  return [...seen].slice(0, 5);
}
