import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "phase5-api.spec.ts",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { outputFolder: "playwright-api-report", open: "never" }]],
  outputDir: "test-results-api",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run start",
      cwd: "..",
      url: "http://127.0.0.1:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        API_PORT: "3000",
        FRONTEND_ORIGIN: "http://127.0.0.1:4174",
        SESSION_COOKIE_SECURE: "false"
      }
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4174",
      cwd: ".",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_USE_API: "true",
        VITE_API_BASE_URL: "http://127.0.0.1:3000"
      }
    }
  ]
});
