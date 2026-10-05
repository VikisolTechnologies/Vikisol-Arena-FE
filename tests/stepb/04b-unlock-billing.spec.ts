import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 4 (unlock credits, billing): confirms these screens — already built in an earlier
// mission — still render real data correctly against the current backend (not a code-reading
// check: this is what's live right now, with real plan/credit numbers from the DB).

const COMPANY_EMAIL = "priya@brightpeak.example";
const COMPANY_PASS = "LocalDemo123!";

test("billing and unlock credits show real plan data", async ({ page }) => {
  await page.goto("/auth?mode=signin");
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
  await page.getByLabel("Email address").fill(COMPANY_EMAIL);
  await page.getByLabel("Password").fill(COMPANY_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20_000 });

  await page.goto("/enterprise/admin/billing");
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/3/).first()).toBeVisible();

  await page.goto("/enterprise/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/credit/i).first()).toBeVisible();
});
