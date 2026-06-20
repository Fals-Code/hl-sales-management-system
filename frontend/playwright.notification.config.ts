import { defineConfig } from "@playwright/test";
import apiConfig from "./playwright.api.config";

export default defineConfig({
  ...apiConfig,
  testMatch: "notification-center-api.spec.ts",
  workers: 1,
  outputDir: "test-results-notification",
  reporter: [["line"], ["html", { outputFolder: "playwright-notification-report", open: "never" }]]
});
