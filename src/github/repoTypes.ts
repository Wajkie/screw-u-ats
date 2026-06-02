export interface RepoHighlight {
  signal: string;
  path: string;
}

export interface GitHubRepo {
  name: string;
  language: string | null;
  isFork?: boolean;
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
  hasCsFiles: boolean;
  packageDeps: string[];
  csprojDeps: string[];
  size: number;
  defaultBranch: string;
  highlights: RepoHighlight[];
}

export interface RawRepo {
  name: string;
  language: string | null;
  fork: boolean;
  created_at: string;
  pushed_at: string;
  topics: string[];
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  size: number;
  default_branch: string;
}

export interface RawContentItem {
  name: string;
  type: "file" | "dir" | "symlink" | "submodule";
}

export interface RawReadme {
  content: string;
  encoding: string;
}

export interface RawFile {
  content?: string;
  encoding?: string;
}

export const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e"]);
export const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;
// Config files are a reliable indicator that tests are set up even when test files live in src/.
export const TEST_CONFIG_PATTERN = /^(vitest|jest|mocha|playwright|cypress)\.config\.[jt]sx?$|^\.mocharc\./;
// Directories that are never package roots — skip them during monorepo scanning.
export const INFRA_DIRS = new Set([
  ".github", ".husky", ".changeset", ".git", ".turbo", ".cache",
  "node_modules", "dist", "build", "coverage", "docs", "docssite", "docker",
  ".next", ".nuxt", "public", "static", "assets",
]);
