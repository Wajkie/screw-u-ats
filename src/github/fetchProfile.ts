export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  accountCreatedAt: string;
  followers: number;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

interface RawProfile {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  created_at: string;
  followers: number;
}

export async function fetchProfile(username: string, token: string): Promise<GitHubProfile> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) {
    throw new GitHubError(`GitHub user not found: ${username}`, 404);
  }
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("GitHub API rate limit exceeded", res.status);
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error: ${res.status}`, res.status);
  }

  const raw = (await res.json()) as RawProfile;
  return {
    login: raw.login,
    name: raw.name,
    bio: raw.bio,
    publicRepos: raw.public_repos,
    accountCreatedAt: raw.created_at,
    followers: raw.followers,
  };
}
