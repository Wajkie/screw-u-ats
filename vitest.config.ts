import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "screener-api/src/**/*.test.ts"],
    exclude: ["mcp-kit/**", "node_modules/**", "dist/**", "screener-api/node_modules/**"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});
