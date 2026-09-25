import { defineConfig, devices } from "@playwright/test";

// No production login, provider calls, or production writes. All API traffic is intercepted.
export default defineConfig({
  testDir: "./tests/local",
  testMatch: "**/*.local.ts",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  // localhost, not 127.0.0.1: Next 16 dev blocks its client resources for a 127.0.0.1 origin,
  // so the page never hydrates.
  use: { baseURL: "http://localhost:3107", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev -- --port 3107 --webpack",
    url: "http://localhost:3107/api/health",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ARENA_NEXT_DIST_DIR: ".next-local-tests", NEXT_PUBLIC_API_MODE: "real",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3199/api/v1",
      NEXT_PUBLIC_SENTRY_DSN: "", SENTRY_DSN: "", STAGING_BASIC_AUTH: "",
    },
  },
});
