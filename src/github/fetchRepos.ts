import { GitHubError } from "./fetchProfile.js";

export interface GitHubRepo {
  name: string;
  language: string | null;
  createdAt: string;
  pushedAt: string;
  topics: string[];
  description: string | null;
  homepage: string | null;
  stargazersCount: number;
  readmeContent: string | null;
  hasTests: boolean;
  hasCi: boolean;
  hasAppRouter: boolean;
  hasHooksDir: boolean;
  hasLibDir: boolean;
  hasActionsDir: boolean;
  packageDeps: string[];
  csprojDeps: string[];
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
  homepage: string | null;
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

interface RawFile {
  content?: string;
  encoding?: string;
}

const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e"]);
const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;
// Config files are a reliable indicator that tests are set up even when test files live in src/.
const TEST_CONFIG_PATTERN = /^(vitest|jest|mocha|playwright|cypress)\.config\.[jt]sx?$|^\.mocharc\./;
// Directories that are never package roots — skip them during monorepo scanning.
const INFRA_DIRS = new Set([
  ".github", ".husky", ".changeset", ".git", ".turbo", ".cache",
  "node_modules", "dist", "build", "coverage", "docs", "docssite", "docker",
  ".next", ".nuxt", "public", "static", "assets",
]);

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchDirContents(
  owner: string,
  repo: string,
  path: string,
  token: string,
): Promise<RawContentItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    { headers: githubHeaders(token) },
  );
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

async function fetchPackageDeps(
  owner: string,
  repo: string,
  token: string,
): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/package.json`,
    { headers: githubHeaders(token) },
  );
  if (!res.ok) return [];
  const raw = (await res.json()) as RawFile;
  if (raw.encoding !== "base64" || !raw.content) return [];
  try {
    const pkg = JSON.parse(
      Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
  } catch {
    return [];
  }
}

async function fetchCsprojDeps(
  owner: string,
  repo: string,
  contents: RawContentItem[],
  token: string,
): Promise<string[]> {
  const csproj = contents.find(
    (item) => item.type === "file" && item.name.endsWith(".csproj"),
  );
  if (!csproj) return [];

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(csproj.name)}`,
    { headers: githubHeaders(token) },
  );
  if (!res.ok) return [];
  const raw = (await res.json()) as RawFile;
  if (raw.encoding !== "base64" || !raw.content) return [];

  const xml = Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8");
  return [...xml.matchAll(/<PackageReference\s+Include="([^"]+)"/gi)].map((m) => m[1]!);
}

function hasTestsInContents(items: RawContentItem[]): boolean {
  return items.some(
    (item) =>
      (item.type === "dir" && TEST_DIR_NAMES.has(item.name.toLowerCase())) ||
      (item.type === "file" && TEST_FILE_PATTERN.test(item.name)) ||
      (item.type === "file" && TEST_CONFIG_PATTERN.test(item.name)),
  );
}

function hasDir(items: RawContentItem[], name: string): boolean {
  return items.some((item) => item.type === "dir" && item.name.toLowerCase() === name);
}

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

  // Nested monorepo: packages/ or apps/ at root.
  // Sample the first package directory — if it has tests, the repo counts as tested.
  const nestedMonorepoDir = contents.find(
    (item) => item.type === "dir" && (item.name === "packages" || item.name === "apps"),
  );
  let monorepoHasTests = false;
  if (nestedMonorepoDir && !hasTestsInContents(contents) && !hasTestsInContents(srcContents)) {
    const pkgList = await fetchDirContents(owner, raw.name, nestedMonorepoDir.name, token);
    const firstPkg = pkgList.find((item) => item.type === "dir");
    if (firstPkg) {
      const pkgRoot = await fetchDirContents(owner, raw.name, `${nestedMonorepoDir.name}/${firstPkg.name}`, token);
      const pkgSrc = pkgRoot.find((item) => item.name === "src" && item.type === "dir")
        ? await fetchDirContents(owner, raw.name, `${nestedMonorepoDir.name}/${firstPkg.name}/src`, token)
        : [];
      monorepoHasTests = hasTestsInContents(pkgRoot) || hasTestsInContents(pkgSrc);
    }
  }

  // Flat monorepo: packages sit directly at root (e.g. a11y-core/, react-a11y/).
  // Check the first few non-infra directories for test indicators.
  if (!monorepoHasTests && !hasTestsInContents(contents) && !hasTestsInContents(srcContents)) {
    const candidatePkgDirs = contents
      .filter((item) => item.type === "dir" && !item.name.startsWith(".") && !INFRA_DIRS.has(item.name))
      .slice(0, 3);
    for (const pkgDir of candidatePkgDirs) {
      const pkgContents = await fetchDirContents(owner, raw.name, pkgDir.name, token);
      if (hasTestsInContents(pkgContents)) {
        monorepoHasTests = true;
        break;
      }
    }
  }

  const hasTests = hasTestsInContents(contents) || hasTestsInContents(srcContents) || monorepoHasTests;

  // Architecture signals — detect from root and src/ contents.
  // app/ = Next.js App Router; hooks/ = custom hook layer; lib/ = service/utility layer;
  // actions/ = server actions or service actions directory.
  const hasAppRouter = hasDir(contents, "app") || hasDir(srcContents, "app");
  const hasHooksDir = hasDir(contents, "hooks") || hasDir(srcContents, "hooks");
  const hasLibDir = hasDir(contents, "lib") || hasDir(srcContents, "lib");
  const hasActionsDir = hasDir(contents, "actions") || hasDir(srcContents, "actions");

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
    packageDeps,
    csprojDeps,
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
