import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 5 (disputes): AdminDisputeController (/admin/disputes) was live on the backend, but this
// screen said "need a platform-admin endpoint" and never called real mode at all. A real dispute
// was raised via curl before this test (Rahul hosted an activity, marked Meera no-show, Meera
// disputed it - mission's own "raise one in an activity" step); this verifies the admin resolve
// side actually works against the real backend.

const ADMIN_EMAIL = "platformadmin-m2@vikisol.dev";
const ADMIN_PASS = "AdminPass123!";

async function totp(): Promise<string> {
  const { execSync } = await import("child_process");
  return execSync(`python3 -c "import pyotp; print(pyotp.TOTP('G4C3E65TBJ2D37RJZ5XXAOGH6KRKLYJY').now())"`).toString().trim();
}

test("admin resolves a real attendance dispute in the joiner's favor", async ({ page }) => {
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

  await page.goto("/admin/disputes");
  await expect(page.getByRole("heading", { name: "Disputes" })).toBeVisible({ timeout: 15_000 });

  // Idempotent across reruns: resolve is terminal server-side (can't re-decide an already-
  // decided dispute), so check whichever tab currently holds this one.
  const openRow = page.getByText("Sunrise walk 2").locator("xpath=ancestor::div[contains(@class,'rounded-tile')][1]");
  if (await openRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await expect(page.getByText(/Host: Rahul Nair.*Joiner: Meera Iyer/)).toBeVisible();
    await openRow.getByRole("button", { name: "Uphold joiner…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Reason").fill("Host's attendance check missed her; she confirmed she was present.");
    await dialog.getByRole("button", { name: "Resolve" }).click();
    await expect(page.getByText("Sunrise walk 2")).toHaveCount(0, { timeout: 10_000 });
  }

  await page.getByRole("radio", { name: "Joiner upheld" }).click();
  await expect(page.getByText("Sunrise walk 2")).toBeVisible({ timeout: 10_000 });
});
