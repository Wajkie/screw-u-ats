import {
  INFRA_DIRS,
  TEST_CONFIG_PATTERN,
  TEST_DIR_NAMES,
  TEST_FILE_PATTERN,
  type RawContentItem,
  type RawFile,
  type RawReadme,
} from "./repoTypes.js";

export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function fetchDirContents(
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

export async function fetchReadme(
  owner: string,
  repo: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    { headers: githubHeaders(token) },
  );
  if (!res.ok) return null;
  const raw = (await res.json()) as RawReadme;
  if (raw.encoding !== "base64") return null;
  return Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

export async function fetchPackageDeps(
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

export async function fetchCsprojDeps(
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

export function hasTestsInContents(items: RawContentItem[]): boolean {
  return items.some(
    (item) =>
      (item.type === "dir" && TEST_DIR_NAMES.has(item.name.toLowerCase())) ||
      (item.type === "file" && TEST_FILE_PATTERN.test(item.name)) ||
      (item.type === "file" && TEST_CONFIG_PATTERN.test(item.name)),
  );
}

export function hasDir(items: RawContentItem[], name: string): boolean {
  return items.some((item) => item.type === "dir" && item.name.toLowerCase() === name);
}

export async function checkMonorepoTests(
  owner: string,
  repo: string,
  contents: RawContentItem[],
  srcContents: RawContentItem[],
  token: string,
): Promise<boolean> {
  const nestedMonorepoDir = contents.find(
    (item) => item.type === "dir" && (item.name === "packages" || item.name === "apps"),
  );
  if (nestedMonorepoDir && !hasTestsInContents(contents) && !hasTestsInContents(srcContents)) {
    const pkgList = await fetchDirContents(owner, repo, nestedMonorepoDir.name, token);
    const firstPkg = pkgList.find((item) => item.type === "dir");
    if (firstPkg) {
      const pkgRoot = await fetchDirContents(owner, repo, `${nestedMonorepoDir.name}/${firstPkg.name}`, token);
      const pkgSrc = pkgRoot.find((item) => item.name === "src" && item.type === "dir")
        ? await fetchDirContents(owner, repo, `${nestedMonorepoDir.name}/${firstPkg.name}/src`, token)
        : [];
      if (hasTestsInContents(pkgRoot) || hasTestsInContents(pkgSrc)) return true;
    }
  }

  // Flat monorepo: packages sit directly at root (e.g. a11y-core/, react-a11y/).
  if (!hasTestsInContents(contents) && !hasTestsInContents(srcContents)) {
    const candidatePkgDirs = contents
      .filter((item) => item.type === "dir" && !item.name.startsWith(".") && !INFRA_DIRS.has(item.name))
      .slice(0, 3);
    for (const pkgDir of candidatePkgDirs) {
      const pkgContents = await fetchDirContents(owner, repo, pkgDir.name, token);
      if (hasTestsInContents(pkgContents)) return true;
    }
  }

  return false;
}
