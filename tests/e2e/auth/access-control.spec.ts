import { test, expect } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";
import { attachMonitor } from "../../utils/monitor";

/** @auth @security — protected-route and cross-role access control (spec §4/§21). This exact
 * class of bug (wrong-role sessions stranded in the wrong onboarding wizard instead of a real
 * "access denied") was found and fixed multiple times in this app's history - see
 * PAGE-INVENTORY.md findings #1/#2 and DECISIONS.md's PA7 writeup. These are regression guards
 * for exactly that class of defect, not a hypothetical.
 *
 * The shared 404 heading ("This page isn't in my database.") is the one deliberate signal both
 * /access-denied AND a wrong-role/logged-out /admin render - see src/app/access-denied/page.tsx's
 * own comment: reusing the same branded 404 everywhere is intentional, so a curious visitor can't
 * tell "route exists but I'm blocked" from "route doesn't exist" (PA7's requirement).
 */
const DENIED_HEADING = "This page isn't in my database.";

test.describe("Logged out — protected routes redirect to /auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ["/home", "/identity", "/settings", "/applications"]) {
    test(`${path} → /auth`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth$/, { timeout: 10_000 });
    });
  }

  test("/enterprise/dashboard → /auth", async ({ page }) => {
    await page.goto("/enterprise/dashboard");
    await expect(page).toHaveURL(/\/auth$/, { timeout: 10_000 });
  });

  test("/admin renders the branded 404 in place — never redirects to /auth, URL unchanged (PA7)", async ({
    page,
  }) => {
    const monitor = attachMonitor(page);
    await page.goto("/admin");
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/admin$/); // stays put - never bounces to /auth
    await expect(page.getByRole("heading", { name: DENIED_HEADING })).toBeVisible();
    // The real bug this app had (DECISIONS.md/PA7): each admin page's own data-fetch effect
    // fired regardless of what the shell rendered, leaking authenticated-looking requests to a
    // rejected visitor. Confirm zero stray network calls, not just the right UI.
    expect(monitor.unexpected(), "an unauthenticated /admin visit made unexpected network calls").toEqual([]);
  });
});

test.describe("Wrong-role access is denied, not stranded in someone else's onboarding", () => {
  test.describe("Talent session", () => {
    test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

    test("talent → /enterprise/dashboard → access denied", async ({ page }) => {
      await page.goto("/enterprise/dashboard");
      await expect(page).toHaveURL(/\/access-denied$/, { timeout: 10_000 });
      await expect(page.getByRole("heading", { name: DENIED_HEADING })).toBeVisible();
    });

    test("talent → /admin → branded 404 in place, URL unchanged", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: DENIED_HEADING })).toBeVisible();
    });
  });

  test.describe("Hiring Manager session (most restricted enterprise role)", () => {
    test.use({ storageState: DEMO_ACCOUNTS.hiring_manager.storageStatePath });

    test("hiring_manager → /enterprise/talent (Talent Universe) → access denied", async ({ page }) => {
      await page.goto("/enterprise/talent");
      await expect(page).toHaveURL(/\/access-denied$/, { timeout: 10_000 });
    });

    test("hiring_manager → /enterprise/postings → access denied", async ({ page }) => {
      await page.goto("/enterprise/postings");
      await expect(page).toHaveURL(/\/access-denied$/, { timeout: 10_000 });
    });

    test("hiring_manager → /admin → branded 404 in place, URL unchanged", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: DENIED_HEADING })).toBeVisible();
    });
  });
});

test.describe("Post-login redirect target", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // Documented CURRENT behaviour, not a defect report: this app's sign-in always lands on the
  // session's role-based default (see redirectForRole() in src/app/auth/page.tsx) - there is no
  // `?redirect=` / return-to-original-deep-link mechanism today. Encoding the real behavior here
  // so a future change to add deep-link return is a deliberate, visible decision, not a silent
  // regression either way.
  test("visiting a protected route while logged out, then signing in, lands on the role's default landing (not the original deep link)", async ({
    page,
  }) => {
    await page.goto("/identity");
    await expect(page).toHaveURL(/\/auth$/);
    await page.getByRole("button", { name: "Talent", exact: false }).click();
    await page.getByLabel("Email").fill(DEMO_ACCOUNTS.talent.email);
    await page.getByLabel("Password").fill(DEMO_ACCOUNTS.talent.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 });
  });
});
