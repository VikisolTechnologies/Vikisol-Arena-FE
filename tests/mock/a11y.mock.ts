import { test, type Page } from "@playwright/test";
import { scan } from "../utils/axe-scan";

/**
 * The accessibility scan from tests/e2e/accessibility, run against a local mock-mode build
 * (no backend, no demo credentials), failing on every violation rather than only
 * critical/serious. Sessions are seeded into localStorage the same way the mock signIn() writes them.
 *
 *   PW_CHROMIUM_PATH=/path/to/chromium npx playwright test -c playwright.mock.config.ts
 */

async function seed(page: Page, role: "talent" | "recruiter") {
  await page.addInitScript((r) => {
    const session = r === "talent"
      ? { role: "talent", name: "You", email: "talent@example.test", candidateId: "cand-1" }
      : { role: "recruiter", name: "Priyanka Rao", email: "recruiter@example.test" };
    localStorage.setItem("arena_session", JSON.stringify(session));
    localStorage.setItem("arena_onboarded", "true");
    localStorage.setItem("arena_enterprise_onboarded", "true");
  }, role);
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

test.describe("Public pages", () => {
  for (const path of ["/", "/auth", "/pricing", "/privacy", "/terms"]) {
    test(path, async ({ page }, testInfo) => {
      await open(page, path);
      await scan(page, testInfo, { strict: true });
    });
  }
});

test.describe("Talent pages", () => {
  const paths = [
    "/home", "/identity", "/discover", "/settings", "/feed", "/map", "/work", "/agent",
    "/messages", "/notifications", "/people", "/jobs", "/rooms", "/marketplace", "/search",
    "/applications", "/interviews", "/identity/edit",
  ];
  for (const path of paths) {
    test(path, async ({ page }, testInfo) => {
      await seed(page, "talent");
      await open(page, path);
      await scan(page, testInfo, { strict: true });
    });
  }
});

test.describe("Enterprise pages", () => {
  for (const path of ["/enterprise/dashboard"]) {
    test(path, async ({ page }, testInfo) => {
      await seed(page, "recruiter");
      await open(page, path);
      await scan(page, testInfo, { strict: true });
    });
  }
});
