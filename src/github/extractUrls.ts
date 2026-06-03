import type { GitHubRepo } from "./fetchRepos.js";

export interface LiveUrl {
  url: string;
  repoName: string;
}

export function extractLiveUrls(repos: GitHubRepo[]): LiveUrl[] {
  const seen = new Map<string, string>();

  for (const repo of repos) {
    const hp = repo.homepage?.trim();
    if (!hp || hp.includes(" ")) continue;
    const withProtocol = hp.startsWith("http") ? hp : `https://${hp}`;
    try {
      const parsed = new URL(withProtocol);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        const normalized = withProtocol.replace(/\/$/, "");
        if (!seen.has(normalized)) seen.set(normalized, repo.name);
      }
    } catch {
      // unparseable — skip
    }
  }

  return [...seen.entries()].slice(0, 10).map(([url, repoName]) => ({ url, repoName }));
}
