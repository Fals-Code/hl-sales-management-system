import js from "@eslint/js";
import promise from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "eslint.config.js"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  promise.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js", "vitest.config.ts"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-duplicate-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/require-await": "off"
    }
  },
  {
    files: ["tests/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off"
    }
  }
);
