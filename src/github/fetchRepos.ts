import { GitHubError } from "./fetchProfile.js";
import {
  checkMonorepoTests,
  fetchCsprojDeps,
  fetchDirContents,
  fetchPackageDeps,
  fetchReadme,
  hasDir,
  hasTestsInContents,
} from "./repoFetchers.js";
import {
  TEST_CONFIG_PATTERN,
  TEST_DIR_NAMES,
  type GitHubRepo,
  type RawRepo,
  type RepoHighlight,
} from "./repoTypes.js";

export type { GitHubRepo, RepoHighlight } from "./repoTypes.js";

async function enrichRepo(owner: string, raw: RawRepo, token: string): Promise<GitHubRepo> {
  const [contents, readmeContent, packageDeps] = await Promise.all([
    fetchDirContents(owner, raw.name, "", token),
    fetchReadme(owner, raw.name, token),
    fetchPackageDeps(owner, raw.name, token),
  ]);

  const csprojDeps = await fetchCsprojDeps(owner, raw.name, contents, token);
  const hasCi = contents.some((item) => item.name === ".github" && item.type === "dir");

  // Check root first; if tests live under src/ (common in TypeScript projects),
  // do one extra fetch to catch patterns like src/__tests__/.
  const hasSrcDir = hasDir(contents, "src");
  const srcContents = hasSrcDir
    ? await fetchDirContents(owner, raw.name, "src", token)
    : [];

  const monorepoHasTests = await checkMonorepoTests(owner, raw.name, contents, srcContents, token);
  const hasTests = hasTestsInContents(contents) || hasTestsInContents(srcContents) || monorepoHasTests;

  // Architecture signals — detect from root and src/ contents.
  // app/ = Next.js App Router; hooks/ = custom hook layer; lib/ = service/utility layer;
  // actions/ = server actions or service actions directory.
  const hasAppRouter = hasDir(contents, "app") || hasDir(srcContents, "app");
  const hasHooksDir = hasDir(contents, "hooks") || hasDir(srcContents, "hooks");
  const hasLibDir = hasDir(contents, "lib") || hasDir(srcContents, "lib");
  const hasActionsDir = hasDir(contents, "actions") || hasDir(srcContents, "actions");
  const hasCsFiles = contents.some((item) => item.type === "file" && item.name.endsWith(".cs"));

  const highlights: RepoHighlight[] = [];
  if (hasCi) highlights.push({ signal: "ci", path: ".github/workflows" });
  if (hasTests) {
    const testDirInRoot = contents.find(
      (item) => item.type === "dir" && TEST_DIR_NAMES.has(item.name.toLowerCase()),
    );
    const testDirInSrc = srcContents.find(
      (item) => item.type === "dir" && TEST_DIR_NAMES.has(item.name.toLowerCase()),
    );
    const testConfigInRoot = contents.find(
      (item) => item.type === "file" && TEST_CONFIG_PATTERN.test(item.name),
    );
    if (testDirInRoot) highlights.push({ signal: "tests", path: testDirInRoot.name });
    else if (testDirInSrc) highlights.push({ signal: "tests", path: `src/${testDirInSrc.name}` });
    else if (testConfigInRoot) highlights.push({ signal: "tests", path: testConfigInRoot.name });
  }
  if (hasAppRouter) highlights.push({ signal: "app_router", path: hasDir(contents, "app") ? "app" : "src/app" });
  if (hasHooksDir) highlights.push({ signal: "hooks", path: hasDir(contents, "hooks") ? "hooks" : "src/hooks" });
  if (hasLibDir) highlights.push({ signal: "lib", path: hasDir(contents, "lib") ? "lib" : "src/lib" });
  if (hasActionsDir) highlights.push({ signal: "actions", path: hasDir(contents, "actions") ? "actions" : "src/actions" });

  return {
    name: raw.name,
    language: raw.language,
    createdAt: raw.created_at,
    pushedAt: raw.pushed_at,
    topics: raw.topics ?? [],
    description: raw.description,
    homepage: raw.homepage ?? null,
    stargazersCount: raw.stargazers_count,
    readmeContent,
    hasTests,
    hasCi,
    hasAppRouter,
    hasHooksDir,
    hasLibDir,
    hasActionsDir,
    hasCsFiles,
    packageDeps,
    csprojDeps,
    size: raw.size,
    highlights,
    defaultBranch: raw.default_branch,
  };
}

export async function withConcurrency<T, R>(
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
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } },
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
  return withConcurrency(rawRepos, 10, (repo) => enrichRepo(username, repo, token));
}
