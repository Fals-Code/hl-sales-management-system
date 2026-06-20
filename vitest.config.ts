import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    isolate: true,
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000
  }
});
