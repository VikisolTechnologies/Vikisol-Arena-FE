import { test as setup, expect } from "@playwright/test";
import { DEMO_ACCOUNTS, type DemoAccount } from "../fixtures/accounts";
import { escapeRegExp } from "../utils/escape-regexp";

/**
 * Runs once before every other project (see playwright.config.ts's `dependencies: ["setup"]`),
 * signs in for real as each of the five demo roles through the actual /auth form (not an API
 * shortcut - this doubles as a live check that sign-in itself works), and saves each session's
 * storageState to disk. Every other spec reuses these instead of re-logging-in per test (spec
 * §26 - "do not log in before every test unnecessarily").
 *
 * Session lives in localStorage (documented app-wide decision - see MOBILE-PERF-BASELINE.md /
 * BLOCKED.md), which Playwright's storageState captures natively alongside cookies.
 */

async function signInAs(page: import("@playwright/test").Page, account: DemoAccount) {
  await page.goto("/auth");
  // exact:false - the two card-style role buttons' accessible name includes their description
  // text too (e.g. "Talent Find opportunities"), confirmed live; a substring match against just
  // the label is safe since no two role buttons on this page share a prefix.
  await page.getByRole("button", { name: account.roleButtonLabel, exact: false }).click();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(escapeRegExp(account.expectedLandingPath)), { timeout: 15_000 });
}

for (const account of Object.values(DEMO_ACCOUNTS)) {
  setup(`authenticate as ${account.role}`, async ({ page }) => {
    await signInAs(page, account);
    await page.context().storageState({ path: account.storageStatePath });
  });
}
