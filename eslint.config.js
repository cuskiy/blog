import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist.tmp", "node_modules", "pages", "*.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // `${count} posts` is plain JavaScript; only objects and symbols are a real hazard
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["src/client/**/*.ts"],
    languageOptions: { globals: { caches: "readonly", self: "readonly" } },
  },
  {
    files: ["test/**/*.ts"],
    // node:test returns a promise from it()/describe(); that is the framework's contract
    rules: { "@typescript-eslint/no-floating-promises": "off" },
  },
  prettier,
);
