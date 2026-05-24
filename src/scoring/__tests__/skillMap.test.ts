import { describe, it, expect } from "vitest";
import { computeSkillMap } from "../skillMap.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "repo",
    language: null,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2024-06-01T00:00:00Z",
    topics: [],
    description: null,
    homepage: null,
    stargazersCount: 0,
    readmeContent: null,
    hasTests: false,
    hasCi: false,
    size: 0,
    defaultBranch: "main",
    hasAppRouter: false,
    hasHooksDir: false,
    hasLibDir: false,
    hasActionsDir: false,
    hasCsFiles: false,
    packageDeps: [],
    csprojDeps: [],
    highlights: [],
    ...overrides,
  };
}

describe("computeSkillMap — empty input", () => {
  it("returns all zeros for empty repo list", () => {
    const result = computeSkillMap([]);
    expect(result).toEqual({ frontend: 0, backend: 0, devops: 0, testing: 0, architecture: 0 });
  });
});

describe("computeSkillMap — frontend axis", () => {
  it("scores frontend-heavy repo with React + Next + Tailwind + AppRouter", () => {
    const repo = makeRepo({
      packageDeps: ["react", "next", "tailwindcss"],
      hasAppRouter: true,
    });
    const result = computeSkillMap([repo]);
    expect(result.frontend).toBeGreaterThan(60);
    expect(result.backend).toBeLessThan(result.frontend);
  });

  it("scores zero frontend for a plain backend repo", () => {
    const repo = makeRepo({ packageDeps: ["express", "prisma"] });
    const result = computeSkillMap([repo]);
    expect(result.frontend).toBe(0);
  });

  it("hooks dir adds frontend signal", () => {
    const withHooks = makeRepo({ packageDeps: ["react"], hasHooksDir: true });
    const withoutHooks = makeRepo({ packageDeps: ["react"] });
    expect(computeSkillMap([withHooks]).frontend).toBeGreaterThan(computeSkillMap([withoutHooks]).frontend);
  });
});

describe("computeSkillMap — backend axis", () => {
  it("scores backend-heavy repo with Express + Prisma + NextAuth", () => {
    const repo = makeRepo({ packageDeps: ["express", "prisma", "next-auth"] });
    const result = computeSkillMap([repo]);
    expect(result.backend).toBeGreaterThan(50);
    expect(result.backend).toBeGreaterThan(result.frontend);
  });

  it("scores .NET backend via csproj deps", () => {
    const repo = makeRepo({
      hasCsFiles: true,
      csprojDeps: ["Microsoft.AspNetCore.OpenApi", "Microsoft.EntityFrameworkCore"],
    });
    const result = computeSkillMap([repo]);
    expect(result.backend).toBeGreaterThanOrEqual(30);
  });

  it("tRPC and GraphQL contribute to backend score", () => {
    const with_ = makeRepo({ packageDeps: ["express", "trpc"] });
    const without = makeRepo({ packageDeps: ["express"] });
    expect(computeSkillMap([with_]).backend).toBeGreaterThan(computeSkillMap([without]).backend);
  });
});

describe("computeSkillMap — devops axis", () => {
  it("CI presence alone gives significant devops score", () => {
    const repo = makeRepo({ hasCi: true });
    expect(computeSkillMap([repo]).devops).toBeGreaterThanOrEqual(50);
  });

  it("scores zero devops for repo with no CI and no deploy signals", () => {
    const repo = makeRepo({ packageDeps: ["react"] });
    expect(computeSkillMap([repo]).devops).toBe(0);
  });

  it("deploy dep adds to devops score on top of CI", () => {
    const withDeploy = makeRepo({ hasCi: true, packageDeps: ["vercel"] });
    const withoutDeploy = makeRepo({ hasCi: true });
    expect(computeSkillMap([withDeploy]).devops).toBeGreaterThan(computeSkillMap([withoutDeploy]).devops);
  });
});

describe("computeSkillMap — testing axis", () => {
  it("hasTests flag is the main driver", () => {
    const repo = makeRepo({ hasTests: true });
    expect(computeSkillMap([repo]).testing).toBeGreaterThanOrEqual(40);
  });

  it("vitest dep stacks on top of hasTests", () => {
    const withFramework = makeRepo({ hasTests: true, packageDeps: ["vitest"] });
    const withoutFramework = makeRepo({ hasTests: true });
    expect(computeSkillMap([withFramework]).testing).toBeGreaterThan(computeSkillMap([withoutFramework]).testing);
  });

  it("E2E (playwright) adds extra testing signal", () => {
    const withE2e = makeRepo({ hasTests: true, packageDeps: ["vitest", "playwright"] });
    const withoutE2e = makeRepo({ hasTests: true, packageDeps: ["vitest"] });
    expect(computeSkillMap([withE2e]).testing).toBeGreaterThan(computeSkillMap([withoutE2e]).testing);
  });

  it("scores zero for repo with no test signals", () => {
    const repo = makeRepo({ packageDeps: ["react"] });
    expect(computeSkillMap([repo]).testing).toBe(0);
  });
});

describe("computeSkillMap — architecture axis", () => {
  it("multiple dir signals produce higher architecture score", () => {
    const rich = makeRepo({ hasLibDir: true, hasActionsDir: true, hasHooksDir: true });
    const sparse = makeRepo({ hasLibDir: true });
    expect(computeSkillMap([rich]).architecture).toBeGreaterThan(computeSkillMap([sparse]).architecture);
  });

  it("scores zero architecture for plain repo with no structural signals", () => {
    const repo = makeRepo({ packageDeps: ["react"] });
    expect(computeSkillMap([repo]).architecture).toBe(0);
  });
});

describe("computeSkillMap — mixed portfolio", () => {
  it("takes max across repos — frontend repo boosts frontend even in mixed portfolio", () => {
    const frontendRepo = makeRepo({ packageDeps: ["react", "next", "tailwindcss"], hasAppRouter: true });
    const backendRepo = makeRepo({ packageDeps: ["express", "prisma"] });
    const result = computeSkillMap([frontendRepo, backendRepo]);
    expect(result.frontend).toBeGreaterThan(60);
    expect(result.backend).toBeGreaterThan(30);
  });

  it("all axes are clamped to 0–100", () => {
    const extremeRepo = makeRepo({
      packageDeps: ["react", "next", "tailwindcss", "express", "prisma", "next-auth", "trpc", "vitest", "playwright"],
      hasAppRouter: true,
      hasHooksDir: true,
      hasLibDir: true,
      hasActionsDir: true,
      hasTests: true,
      hasCi: true,
    });
    const result = computeSkillMap([extremeRepo]);
    for (const val of Object.values(result)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });
});
