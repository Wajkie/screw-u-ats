import { GitHubError } from "../../../src/github/fetchProfile.js";

interface SearchUsersResponse {
  items: Array<{ login: string }>;
}

export async function searchGitHubUsers(
  keywords: string[],
  token: string,
  maxResults = 30,
): Promise<string[]> {
  const q = encodeURIComponent(keywords.join(" "));
  const res = await fetch(`https://api.github.com/search/users?q=${q}&per_page=${maxResults}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("GitHub API rate limit exceeded", res.status);
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error: ${res.status}`, res.status);
  }

  const data = (await res.json()) as SearchUsersResponse;
  return data.items.map((item) => item.login);
}
