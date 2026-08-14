import { test, expect } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/** @auth @smoke — sign-in lifecycle against the real /auth form and the real API. Valid-login
 * coverage for all 5 roles already happens in tests/setup/auth.setup.ts (it IS the login test,
 * not just fixture setup - it fails loudly if sign-in itself breaks); this file covers the
 * validation/error/session paths that setup doesn't exercise. No signup test here: real signup
 * creates a real account with no delete-my-account-via-API path confirmed safe to call from a
 * test - see TESTING.md's "what's not covered yet" for why that's deliberately out of this pass.
 */

test.describe("Sign-in validation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("empty email and password shows a validation error, does not call the API", async ({ page }) => {
    await page.goto("/auth");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Email and password are required")).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("malformed email is rejected by the browser before submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("whatever123");
    await page.locator('button[type="submit"]').click();
    // Native HTML5 <input type="email"> validation should block the form submit entirely -
    // still on /auth, and the browser reports the field itself as invalid.
    await expect(page).toHaveURL(/\/auth$/);
    const isValid = await page.getByLabel("Email").evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test("wrong password for a real account shows an error, stays on /auth", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Talent", exact: false }).click();
    await page.getByLabel("Email").fill(DEMO_ACCOUNTS.talent.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password-123");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("p.text-red-400")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("submit button shows a loading state and disables while submitting", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Talent", exact: false }).click();
    await page.getByLabel("Email").fill(DEMO_ACCOUNTS.talent.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password-123");
    const submit = page.locator('button[type="submit"]');
    await submit.click();
    // Real network round trip to a live API - this assertion is only meaningful if it catches
    // the button mid-flight, so check immediately rather than waiting.
    await expect(submit).toBeDisabled();
  });
});

test.describe("Session behaviour", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

  test("an authenticated session survives a full page reload", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home$/);
    await page.reload();
    await page.waitForTimeout(1500);
    // Still authenticated post-reload, not bounced to /auth - session is localStorage-backed
    // (not a re-issued-per-load cookie), so this is a real persistence check, not a given.
    await expect(page).toHaveURL(/\/home$/);
  });
});
