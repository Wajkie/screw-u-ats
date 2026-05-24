import { z } from "zod";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { ToolRuntime } from "../toolRuntime.js";
import { withCache } from "../cache.js";
import { scoreCandidate } from "./scoreCandidate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rolesDir = resolve(__dirname, "../../knowledge/roles");

const ROLES = ["junior-frontend", "junior-fullstack", "junior-csharp"] as const;

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
      include_lighthouse: z
        .boolean()
        .optional()
        .default(false)
        .describe("Run Lighthouse audits on live project URLs found in repos (default: false)"),
    },
    handler: async ({ github_username, role, include_lighthouse }, ctx) =>
      withCache(
        ctx.cache,
        `score_candidate:${github_username}:${role}:lh${include_lighthouse ? "1" : "0"}`,
        600,
        () =>
          scoreCandidate(
            github_username,
            role,
            ctx.config.githubToken,
            rolesDir,
            include_lighthouse,
            ctx.config.pagespeedApiKey,
          ),
      ),
  });
}
