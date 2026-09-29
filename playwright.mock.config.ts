import { defineConfig, devices } from "@playwright/test";

/** Mock-mode browser tests against a local Next server. No arena.vikisol.in, no live auth.
 * Uses /dev/* sign-in helpers. Default API mode is mock (NEXT_PUBLIC_API_MODE unset). */
export default defineConfig({
  testDir: "./tests/e2e/admin",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3108", trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next build && npx next start -p 3108",
    url: "http://localhost:3108/api/health",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ARENA_NEXT_DIST_DIR: ".next-mock-tests",
      NEXT_PUBLIC_API_MODE: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      SENTRY_DSN: "",
      STAGING_BASIC_AUTH: "",
    },
  },
});
