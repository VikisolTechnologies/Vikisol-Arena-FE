import { defineConfig, devices } from "@playwright/test";

// Mock mode: the app's built-in localStorage data layer, no backend, no production login.
export default defineConfig({
  testDir: "./tests/mock",
  testMatch: "**/*.mock.ts",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/mock-results.json" }]],
  use: {
    baseURL: "http://localhost:3108",
    trace: "retain-on-failure",
    // Optional: point at a preinstalled Chromium when the pinned browser build isn't downloaded.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3108",
    url: "http://localhost:3108/api/health",
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_MODE: "mock",
      NEXT_PUBLIC_SENTRY_DSN: "", SENTRY_DSN: "", STAGING_BASIC_AUTH: "",
    },
  },
});
