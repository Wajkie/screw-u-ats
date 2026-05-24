import { GitHubError } from "./fetchProfile.js";

export interface GitHubRepo {
  name: string;
  language: string | null;
  createdAt: string;
  pushedAt: string;
  topics: string[];
  description: string | null;
  stargazersCount: number;
  readmeContent: string | null;
  hasTests: boolean;
  hasCi: boolean;
  size: number;
  defaultBranch: string;
}

interface RawRepo {
  name: string;
  language: string | null;
  created_at: string;
  pushed_at: string;
  topics: string[];
  description: string | null;
  stargazers_count: number;
  size: number;
  default_branch: string;
}

interface RawContentItem {
  name: string;
  type: "file" | "dir" | "symlink" | "submodule";
}

interface RawReadme {
  content: string;
  encoding: string;
}

const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e"]);
const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchRootContents(
  owner: string,
  repo: string,
  token: string,
): Promise<RawContentItem[]> {
  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`, {
    headers: githubHeaders(token),
  });
  if (!res.ok) return [];
  return (await res.json()) as RawContentItem[];
}

async function fetchReadme(
  owner: string,
  repo: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, {
    headers: githubHeaders(token),
  });
  if (!res.ok) return null;
  const raw = (await res.json()) as RawReadme;
  if (raw.encoding !== "base64") return null;
  return Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

async function enrichRepo(owner: string, raw: RawRepo, token: string): Promise<GitHubRepo> {
  const [contents, readmeContent] = await Promise.all([
    fetchRootContents(owner, raw.name, token),
    fetchReadme(owner, raw.name, token),
  ]);

  const hasCi = contents.some((item) => item.name === ".github" && item.type === "dir");
  const hasTests = contents.some(
    (item) =>
      (item.type === "dir" && TEST_DIR_NAMES.has(item.name.toLowerCase())) ||
      (item.type === "file" && TEST_FILE_PATTERN.test(item.name)),
  );

  return {
    name: raw.name,
    language: raw.language,
    createdAt: raw.created_at,
    pushedAt: raw.pushed_at,
    topics: raw.topics ?? [],
    description: raw.description,
    stargazersCount: raw.stargazers_count,
    readmeContent,
    hasTests,
    hasCi,
    size: raw.size,
    defaultBranch: raw.default_branch,
  };
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchRepos(username: string, token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&type=owner`,
    { headers: githubHeaders(token) },
  );

  if (res.status === 404) {
    throw new GitHubError(`GitHub user not found: ${username}`, 404);
  }
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("GitHub API rate limit exceeded", res.status);
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error: ${res.status}`, res.status);
  }

  const rawRepos = (await res.json()) as RawRepo[];

  // Enrich with per-repo data, max 10 concurrent requests
  return withConcurrency(rawRepos, 10, (repo) => enrichRepo(username, repo, token));
}
