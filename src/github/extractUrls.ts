import type { GitHubRepo } from "./fetchRepos.js";

export function extractLiveUrls(repos: GitHubRepo[]): string[] {
  const seen = new Set<string>();

  for (const repo of repos) {
    const hp = repo.homepage?.trim();
    if (!hp || hp.includes(" ")) continue;
    const withProtocol = hp.startsWith("http") ? hp : `https://${hp}`;
    try {
      const url = new URL(withProtocol);
      if (url.protocol === "https:" || url.protocol === "http:") {
        seen.add(withProtocol.replace(/\/$/, ""));
      }
    } catch {
      // unparseable — skip
    }
  }

  return [...seen].slice(0, 10);
}
