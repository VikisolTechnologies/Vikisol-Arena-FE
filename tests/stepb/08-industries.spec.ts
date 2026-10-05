import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 5 (industries): IndustryController's /admin/industries (GET/POST/PUT) had no frontend
// screen at all - built one. Verifies "add one, and it appears in the company's picker" exactly
// as the mission names it.

const ADMIN_EMAIL = "platformadmin-m2@vikisol.dev";
const ADMIN_PASS = "AdminPass123!";
const COMPANY_EMAIL = "priya@brightpeak.example";
const COMPANY_PASS = "LocalDemo123!";
const NEW_INDUSTRY = `Beekeeping ${Date.now()}`;

async function totp(): Promise<string> {
  const { execSync } = await import("child_process");
  return execSync(`python3 -c "import pyotp; print(pyotp.TOTP('G4C3E65TBJ2D37RJZ5XXAOGH6KRKLYJY').now())"`).toString().trim();
}

test("admin adds an industry, it shows up in the company's picker", async ({ page }) => {
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

  await page.goto("/admin/industries");
  await expect(page.getByRole("heading", { name: "Industries" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("New industry name").fill(NEW_INDUSTRY);
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(NEW_INDUSTRY)).toBeVisible({ timeout: 10_000 });

  await page.context().clearCookies();
  await page.goto("/auth?mode=signin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const ok2 = page.getByRole("button", { name: "OK" });
  if (await ok2.isVisible({ timeout: 3_000 }).catch(() => false)) await ok2.click();
  await page.getByLabel("Email address").fill(COMPANY_EMAIL);
  await page.getByLabel("Password").fill(COMPANY_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20_000 });

  await page.goto("/enterprise/admin/company");
  await expect(page.getByLabel("Industry")).toBeVisible({ timeout: 15_000 });
  const options = await page.getByLabel("Industry").locator("option").allTextContents();
  expect(options).toContain(NEW_INDUSTRY);
});
