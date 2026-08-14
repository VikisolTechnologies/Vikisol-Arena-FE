import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// .env.test is gitignored (per .gitignore's blanket `.env*` rule) - real credentials never get
// committed. .env.test.example documents every variable this suite reads; copy it to .env.test
// and fill in real values (see TEST-LOGINS.md for the actual demo-account credentials) to run
// anything beyond the fully-public specs.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

// No environment currently exists other than this one - verified live (2026-08-14) that
// arena.vikisol.in and arena-web-production-f1f4.up.railway.app return an IDENTICAL /version
// commit hash (same for the two API hostnames), i.e. the custom domain is just an alias for the
// same Railway deployment TEST-LOGINS.md calls "staging." There is one real environment, seeded
// with demo accounts meant for exactly this kind of testing - see TESTING.md's "Data safety"
// section for what that does and doesn't license this suite to do against it.
const BASE_URL = process.env.ARENA_BASE_URL || "https://arena.vikisol.in";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries hide real intermittent bugs as much as they hide flake - per this project's own
  // testing rule (spec §31 / CLAUDE.md's "don't hide failures"), keep this at 0 locally. CI gets
  // exactly one retry, only to absorb genuine network jitter against a real live deployment
  // (this suite has no isolated environment to run against), never to paper over a real failure -
  // a test that only passes on retry #2 still gets reported as flaky in the HTML report, not
  // silently green.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 45_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Auth setup runs once per role, signs in for real, saves storageState - every other
    // project's tests depend on this instead of re-logging-in per test (spec §26).
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop, primary breakpoint (matches this project's own prior perf/audit baselines: 1440x900).
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },

    // Mobile x2, real device+browser pairings rather than one viewport forced onto both engines
    // (Android devices default to Chromium, iOS devices default to WebKit in Playwright's own
    // presets - that's also a more honest test than "Chrome pretending to be an iPhone"). This
    // conveniently covers two of the three mobile breakpoints named in the QA spec (412x915,
    // 390x844) with well-maintained upstream presets instead of hand-rolled viewport configs.
    // 390x844/iPhone-13 in particular is the exact profile MOBILE-ROOT-CAUSE.md and
    // STABILIZE-REPORT.md already standardized on, so perf numbers stay comparable to that prior
    // work rather than introducing a new arbitrary baseline.
    {
      name: "mobile-chromium", // Pixel 7, 412x915
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: "mobile-webkit", // iPhone 13, 390x844
      use: { ...devices["iPhone 13"] },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
});
