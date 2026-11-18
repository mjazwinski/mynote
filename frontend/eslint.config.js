import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  {
    ignores: ["dist/", "build/", "coverage/", "node_modules/", "playwright-report/", "test-results/", "*.min.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks, sonarjs },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Constitution: anything with cognitive complexity > 3 needs a unit test.
      // Reported as a warning so it can be cross-checked against tests (task T095).
      "sonarjs/cognitive-complexity": ["warn", 3],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright fixtures use a `use` callback that is not a React hook.
    files: ["tests/e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
);
