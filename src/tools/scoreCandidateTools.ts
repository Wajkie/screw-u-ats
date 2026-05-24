import { z } from "zod";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { ToolRuntime } from "../toolRuntime.js";
import { withCache } from "../cache.js";
import { scoreCandidate } from "./scoreCandidate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rolesDir = resolve(__dirname, "../../knowledge/roles");

const ROLES = ["junior-frontend", "junior-fullstack"] as const;

export function registerScoreCandidateTools(runtime: ToolRuntime): void {
  runtime.register({
    name: "score_candidate",
    description:
      "Score a GitHub user against a role definition. Returns fit_score (0–100), recommendation (Interview/Pass), per-signal breakdown, matched and missing concepts, and a trajectory summary.",
    sideEffect: "read",
    inputSchema: {
      github_username: z.string().describe("GitHub username to evaluate"),
      role: z
        .enum(ROLES)
        .describe("Role to evaluate against: junior-frontend or junior-fullstack"),
    },
    handler: async ({ github_username, role }, ctx) =>
      withCache(
        ctx.cache,
        `score_candidate:${github_username}:${role}`,
        600,
        () => scoreCandidate(github_username, role, ctx.config.githubToken, rolesDir),
      ),
  });
}
