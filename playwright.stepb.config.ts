import { defineConfig, devices } from "@playwright/test";

// THROWAWAY config for MARATHON-FE-2 Step B: real local backend (localhost:8081), real FE dev
// server. Not a permanent suite — delete this file and tests/stepb/* before the final commit.
export default defineConfig({
  testDir: "./tests/stepb",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", actionTimeout: 15_000 },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next dev -p 3000",
    url: "http://localhost:3000/api/health",
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
