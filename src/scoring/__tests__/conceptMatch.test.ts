import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseRoleDefinition, matchConcepts } from "../conceptMatch.js";
import type { RoleDefinition } from "../conceptMatch.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

const rolesDir = resolve(__dirname, "../../../knowledge/roles");

let frontendMd: string;
let fullstackMd: string;

beforeAll(() => {
  frontendMd = readFileSync(resolve(rolesDir, "junior-frontend.md"), "utf-8");
  fullstackMd = readFileSync(resolve(rolesDir, "junior-fullstack.md"), "utf-8");
});

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "test-repo",
    language: null,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2024-01-01T00:00:00Z",
    topics: [],
    description: null,
    stargazersCount: 0,
    readmeContent: null,
    hasTests: false,
    hasCi: false,
    size: 0,
    defaultBranch: "main",
    ...overrides,
  };
}

describe("parseRoleDefinition — junior-frontend.md", () => {
  it("extracts the role name", () => {
    const role = parseRoleDefinition(frontendMd);
    expect(role.name).toBe("Junior Frontend Engineer");
  });

  it("parses all required concepts (9 expected)", () => {
    const role = parseRoleDefinition(frontendMd);
    expect(role.requiredConcepts).toHaveLength(9);
  });

  it("parses all bonus concepts (8 expected)", () => {
    const role = parseRoleDefinition(frontendMd);
    expect(role.bonusConcepts).toHaveLength(8);
  });

  it("parses minimum_complexity_score: 35", () => {
    const role = parseRoleDefinition(frontendMd);
    expect(role.minimumComplexityScore).toBe(35);
  });

  it("required concepts include React and TypeScript entries", () => {
    const role = parseRoleDefinition(frontendMd);
    const text = role.requiredConcepts.join(" ");
    expect(text).toMatch(/react/i);
    expect(text).toMatch(/typescript/i);
  });

  it("bonus concepts include deployment/CI entry", () => {
    const role = parseRoleDefinition(frontendMd);
    const text = role.bonusConcepts.join(" ");
    expect(text).toMatch(/deployment/i);
  });
});

describe("parseRoleDefinition — junior-fullstack.md", () => {
  it("extracts the role name", () => {
    const role = parseRoleDefinition(fullstackMd);
    expect(role.name).toBe("Junior Fullstack Engineer");
  });

  it("parses all required concepts (10 expected)", () => {
    const role = parseRoleDefinition(fullstackMd);
    expect(role.requiredConcepts).toHaveLength(10);
  });

  it("parses minimum_complexity_score: 45", () => {
    const role = parseRoleDefinition(fullstackMd);
    expect(role.minimumComplexityScore).toBe(45);
  });

  it("required concepts include Node.js and database entries", () => {
    const role = parseRoleDefinition(fullstackMd);
    const text = role.requiredConcepts.join(" ");
    expect(text).toMatch(/node/i);
    expect(text).toMatch(/relational database/i);
  });
});

describe("matchConcepts — empty repos", () => {
  it("marks all required concepts as missing when repos have no content", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts([makeRepo()], role);
    expect(result.missingConcepts).toHaveLength(role.requiredConcepts.length);
    expect(result.matchedConcepts).toHaveLength(0);
  });

  it("returns score 0 when nothing matches", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts([makeRepo()], role);
    expect(result.score).toBe(0);
  });

  it("returns score 0 for empty repos list", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts([], role);
    expect(result.score).toBe(0);
  });
});

describe("matchConcepts — frontend concept detection", () => {
  it("detects React from topics", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts([makeRepo({ topics: ["react", "vite"] })], role);
    expect(result.matchedConcepts.some((c) => /react/i.test(c))).toBe(true);
  });

  it("detects JavaScript from README", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts(
      [makeRepo({ readmeContent: "Built with JavaScript ES6+ and modern tooling." })],
      role,
    );
    expect(result.matchedConcepts.some((c) => /javascript/i.test(c))).toBe(true);
  });

  it("detects TypeScript from language field", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts([makeRepo({ language: "TypeScript" })], role);
    expect(result.matchedConcepts.some((c) => /typescript/i.test(c))).toBe(true);
  });

  it("detects signals across multiple repos", () => {
    const role = parseRoleDefinition(frontendMd);
    const repos = [
      makeRepo({ topics: ["react"] }),
      makeRepo({ readmeContent: "Pure CSS flexbox and grid layout tutorial." }),
      makeRepo({ language: "TypeScript" }),
    ];
    const result = matchConcepts(repos, role);
    expect(result.matchedConcepts.length).toBeGreaterThanOrEqual(3);
  });

  it("detects Git workflow from description", () => {
    const role = parseRoleDefinition(frontendMd);
    const result = matchConcepts(
      [makeRepo({ description: "Feature branch workflow with pull requests" })],
      role,
    );
    expect(result.matchedConcepts.some((c) => /git/i.test(c))).toBe(true);
  });
});

describe("matchConcepts — fullstack concept detection", () => {
  it("detects Node.js from topics", () => {
    const role = parseRoleDefinition(fullstackMd);
    const result = matchConcepts([makeRepo({ topics: ["nodejs", "express"] })], role);
    expect(result.matchedConcepts.some((c) => /node/i.test(c))).toBe(true);
  });

  it("detects database integration from README", () => {
    const role = parseRoleDefinition(fullstackMd);
    const result = matchConcepts(
      [makeRepo({ readmeContent: "Uses PostgreSQL with parameterized queries and Prisma ORM." })],
      role,
    );
    expect(result.matchedConcepts.some((c) => /relational database/i.test(c))).toBe(true);
  });

  it("detects Docker as a bonus concept", () => {
    const role = parseRoleDefinition(fullstackMd);
    const result = matchConcepts(
      [makeRepo({ readmeContent: "Includes docker-compose for local development." })],
      role,
    );
    expect(result.bonusMatched.some((c) => /docker/i.test(c))).toBe(true);
  });
});

describe("matchConcepts — scoring", () => {
  it("score is 80 when all required concepts match and no bonus", () => {
    const role: RoleDefinition = {
      name: "Test Role",
      requiredConcepts: ["react", "css"],
      bonusConcepts: ["typescript"],
      minimumComplexityScore: 0,
    };
    const repos = [makeRepo({ readmeContent: "built with react and css styles" })];
    expect(matchConcepts(repos, role).score).toBe(80);
  });

  it("score is 100 when all required and all bonus match", () => {
    const role: RoleDefinition = {
      name: "Test Role",
      requiredConcepts: ["react"],
      bonusConcepts: ["typescript"],
      minimumComplexityScore: 0,
    };
    const repos = [makeRepo({ readmeContent: "react typescript app", language: "TypeScript" })];
    expect(matchConcepts(repos, role).score).toBe(100);
  });

  it("score is proportional to required concept matches (1 of 3 = 27)", () => {
    const role: RoleDefinition = {
      name: "Test Role",
      requiredConcepts: ["react", "css", "webpack"],
      bonusConcepts: [],
      minimumComplexityScore: 0,
    };
    const repos = [makeRepo({ topics: ["react"] })];
    expect(matchConcepts(repos, role).score).toBe(27);
  });

  it("score never exceeds 100 even with overlapping signals", () => {
    const role = parseRoleDefinition(frontendMd);
    const repos = [
      makeRepo({
        language: "TypeScript",
        readmeContent:
          "React app with TypeScript, Redux, Vite, Vitest, Tailwind, react-hook-form, Zod. " +
          "![demo](screenshot.png) Live at https://myapp.vercel.app",
        topics: ["react", "typescript", "redux", "vite", "tailwind"],
      }),
    ];
    expect(matchConcepts(repos, role).score).toBeLessThanOrEqual(100);
  });

  it("a strong frontend candidate scores above 70", () => {
    const role = parseRoleDefinition(frontendMd);
    const repos = [
      makeRepo({
        language: "TypeScript",
        readmeContent:
          "React app using hooks, useState, useEffect, Redux Toolkit for state management. " +
          "REST API integration with fetch. Built with Vite and TypeScript. " +
          "Deployed to Vercel. CSS grid and flexbox layout.",
        topics: ["react", "typescript", "redux", "vite"],
        description: "Feature branch git workflow with pull requests",
      }),
    ];
    expect(matchConcepts(repos, role).score).toBeGreaterThan(70);
  });
});
