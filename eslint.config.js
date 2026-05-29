import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const sharedTsRules = {
  semi: ["error", "always"],
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/naming-convention": [
    "warn",
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: "variable",
      modifiers: ["const"],
      format: ["camelCase", "UPPER_CASE"],
      leadingUnderscore: "allow",
    },
    { selector: "variable", format: ["camelCase"], leadingUnderscore: "allow" },
    { selector: "function", format: ["camelCase"] },
    { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
  ],
  "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "*/dist/**", "*/node_modules/**", "mcp-kit/**"] },

  tseslint.configs.recommended,

  // MCP server
  {
    files: ["src/**/*.ts"],
    rules: { ...sharedTsRules },
  },

  // screener-api backend
  {
    files: ["screener-api/src/**/*.ts"],
    rules: { ...sharedTsRules },
  },

  // screener-ui frontend
  {
    files: ["screener-ui/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...sharedTsRules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Test files — relax naming and line-length rules
  {
    files: ["src/**/*.test.ts", "screener-api/src/**/*.test.ts"],
    rules: {
      "max-lines": "off",
      "@typescript-eslint/naming-convention": "off",
    },
  },

  // MCP tool handlers use snake_case parameter names per MCP spec
  {
    files: ["src/tools/*.ts"],
    rules: { "@typescript-eslint/naming-convention": "off" },
  },
);
