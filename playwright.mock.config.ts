import { defineConfig, devices } from "@playwright/test";

/** Mock-mode browser tests against a local Next server. No arena.vikisol.in, no live auth.
 * Uses /dev/* sign-in helpers. Forces mock mode below regardless of .env.local, since
 * NEXT_PUBLIC_ARENA_DATA is now the one flag for both real-mode data calls and fixtures. */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/admin/**/*.spec.ts", "**/account/**/*.spec.ts", "**/preview/**/*.spec.ts"],
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
      NEXT_PUBLIC_ARENA_DATA: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      SENTRY_DSN: "",
      STAGING_BASIC_AUTH: "",
    },
  },
});
