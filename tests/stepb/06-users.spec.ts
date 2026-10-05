import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 5 (users): AdminAccountController's /admin/users/{id} GET, suspend, restore and
// force-signout were live on the backend, but this screen hid all of it in real mode and showed
// a hardcoded "suspended: false" stub. Verifies the real wiring: view profile, suspend, see the
// status flip, restore, see it flip back.

const ADMIN_EMAIL = "platformadmin-m2@vikisol.dev";
const ADMIN_PASS = "AdminPass123!";

async function totp(): Promise<string> {
  const { execSync } = await import("child_process");
  return execSync(`python3 -c "import pyotp; print(pyotp.TOTP('G4C3E65TBJ2D37RJZ5XXAOGH6KRKLYJY').now())"`).toString().trim();
}

test("admin views a real profile, suspends, then restores the account", async ({ page }) => {
  await page.goto("/auth?mode=signin");
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const mfaField = page.getByLabel(/6-digit code/i);
  const mfaShown = await mfaField.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  if (mfaShown) {
    await mfaField.click();
    await mfaField.pressSequentially(await totp(), { delay: 50 });
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.waitForURL(/admin/, { timeout: 20_000 });

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Search users").fill("arjun");
  const row = page.getByText("Arjun Verma").locator("xpath=ancestor::div[contains(@class,'rounded-tile')][1]");
  await expect(row).toBeVisible({ timeout: 10_000 });

  await row.getByRole("button", { name: "View profile" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Status: (active|suspended)/)).toBeVisible({ timeout: 10_000 });
  // Idempotent across reruns: start from whichever state this account is already in.
  const startedSuspended = await dialog.getByText("Status: suspended").isVisible().catch(() => false);
  await page.getByRole("button", { name: "Close" }).or(page.locator("[aria-label='Close']")).first().click().catch(() => {});

  if (!startedSuspended) {
    await row.getByRole("button", { name: /Suspend/ }).click();
    await dialog.getByLabel("Reason").fill("Investigating a report.");
    await dialog.getByRole("button", { name: "Suspend", exact: true }).click();
    await expect(row.getByText("suspended", { exact: true })).toBeVisible({ timeout: 10_000 });
  }

  await row.getByRole("button", { name: /Restore/ }).click();
  await dialog.getByLabel("Reason").fill("Report was unfounded.");
  await dialog.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(row.getByText("active", { exact: true })).toBeVisible({ timeout: 10_000 });
});
