import { test, expect, type Page } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 5 (moderation): a report was filed via curl (Meera reports Kabir) before this test runs.
// This test drives the admin moderation screen for real: warn, then suspend, then confirms the
// suspended account can't sign in. Before this fix, AdminAccountController's warn/suspend/ban
// were live on the backend but the FE's moderation page said "preview-only until the API
// supports them" and only ever wrote a local fixture note - this proves the real wiring works.

const ADMIN_EMAIL = "platformadmin-m2@vikisol.dev";
const ADMIN_PASS = "AdminPass123!";
const KABIR_EMAIL = "kabir.shah.candidate@example.com";
const KABIR_PASS = "LocalDemo123!";

async function totp(): Promise<string> {
  const { execSync } = await import("child_process");
  return execSync(`python3 -c "import pyotp; print(pyotp.TOTP('G4C3E65TBJ2D37RJZ5XXAOGH6KRKLYJY').now())"`).toString().trim();
}

async function dismissCookieBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
}

test("admin warns then suspends the reported account from the moderation queue; suspended account can't sign in", async ({ page }) => {
  await page.goto("/auth?mode=signin");
  await dismissCookieBanner(page);
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const mfaField = page.getByLabel(/6-digit code/i);
  const mfaShown = await mfaField.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  if (mfaShown) {
    await mfaField.click();
    await mfaField.pressSequentially(await totp(), { delay: 50 });
    await expect(mfaField).toHaveValue(/^\d{6}$/);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.waitForURL(/admin/, { timeout: 20_000 });

  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible({ timeout: 15_000 });
  const row = page.getByText(/Report about Kabir Shah/).locator("xpath=ancestor::div[contains(@class,'rounded-tile')][1]");
  await expect(row).toBeVisible({ timeout: 10_000 });

  await row.getByRole("button", { name: /Warn/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reason").fill("First warning for inappropriate messaging.");
  await dialog.getByRole("button", { name: "Send warning" }).click();
  await expect(row.getByText(/First warning/)).toBeVisible({ timeout: 10_000 });

  await row.getByRole("button", { name: /Suspend/ }).click();
  await dialog.getByLabel("Reason").fill("Repeated inappropriate messages after a warning.");
  await dialog.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(row.getByText(/Repeated inappropriate/)).toBeVisible({ timeout: 10_000 });
});

test("the suspended account can't sign in", async ({ page }) => {
  await page.goto("/auth?mode=signin");
  await dismissCookieBanner(page);
  await page.getByLabel("Email address").fill(KABIR_EMAIL);
  await page.getByLabel("Password").fill(KABIR_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/suspend/i)).toBeVisible({ timeout: 10_000 });
});
