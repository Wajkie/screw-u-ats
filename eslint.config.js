import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },

  tseslint.configs.recommended,

  {
    files: ["src/**/*.ts"],
    rules: {
      semi: ["error", "always"],

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase"],
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
      ],

      "max-lines": [
        "warn",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  {
    files: ["src/**/*.test.ts"],
    rules: {
      "max-lines": "off",
      "@typescript-eslint/naming-convention": "off",
    },
  },

  {
    // MCP tool handlers use snake_case parameter names per MCP spec.
    files: ["src/tools/*.ts"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },
);
