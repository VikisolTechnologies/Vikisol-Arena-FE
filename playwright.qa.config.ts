import { defineConfig, devices } from "@playwright/test";

// MARATHON-QA: real frontend (localhost:3000) + real backend (localhost:8081/api/v1), no
// fixtures, no stubbed routes. Four screen sizes per docs/missions/MARATHON-QA.md.
export default defineConfig({
  testDir: "./tests/qa",
  testMatch: "**/*.qa.ts",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "small-phone", use: { viewport: { width: 360, height: 740 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  outputDir: "./tests/qa/.artifacts",
});
