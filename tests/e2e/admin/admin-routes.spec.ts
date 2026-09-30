import { test, expect } from "@playwright/test";

/**
 * Arena Admin routes in MOCK mode via /dev/admin (never arena.vikisol.in).
 * Run: npx playwright test -c playwright.mock.config.ts
 */
const ADMIN_ROUTES = [
  { path: "/admin", heading: "Overview" },
  { path: "/admin/verification", heading: "Verification queue" },
  { path: "/admin/moderation", heading: "Moderation" },
  { path: "/admin/users", heading: "Users" },
  { path: "/admin/tenants", heading: "Companies" },
  { path: "/admin/content", heading: "Content" },
  { path: "/admin/disputes", heading: "Disputes" },
  { path: "/admin/jenny", heading: "Jenny & AI oversight" },
  { path: "/admin/analytics", heading: "Analytics" },
  { path: "/admin/flags", heading: "Feature flags" },
  { path: "/admin/audit", heading: "Audit log" },
  { path: "/admin/team", heading: "Admin team" },
] as const;

async function openAdmin(page: import("@playwright/test").Page, path: string) {
  await page.goto(`/dev/admin?to=${encodeURIComponent(path)}`);
  await page.waitForURL((url) => url.pathname === path || url.pathname.startsWith(`${path}/`), {
    timeout: 30_000,
  });
}

test.describe("Platform admin — B+ admin routes (mock)", () => {
  for (const { path, heading } of ADMIN_ROUTES) {
    test(`${path} renders for platform_admin`, async ({ page }) => {
      await openAdmin(page, path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Preview data").first()).toBeVisible();
    });
  }

  test("every admin page has its own title", async ({ page }) => {
    for (const { path, heading } of ADMIN_ROUTES) {
      await openAdmin(page, path);
      const short: Record<string, string> = { "/admin/tenants": "Companies", "/admin/jenny": "Jenny & AI", "/admin/team": "Admin team", "/admin/verification": "Verification" };
      const expected = path === "/admin" ? "Overview" : short[path] ?? heading;
      await expect(page).toHaveTitle(`${expected} · Arena Admin`);
    }
  });

  test("approving a domain mismatch needs a written note, which lands in the audit log", async ({ page }) => {
    await openAdmin(page, "/admin/verification");
    await expect(page.getByText("Mismatch — review manually")).toBeVisible();
    // Matching domain: approves at once, no sheet.
    await page.getByRole("button", { name: "Approve" }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Mismatch: a confirmation with a required note.
    await page.getByRole("button", { name: "Approve" }).first().click();
    const sheet = page.getByRole("dialog", { name: "Approve despite a domain mismatch?" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Approve with note" }).click();
    await expect(sheet.getByText("A reason is required.")).toBeVisible();
    await expect(page.getByText("Mismatch — review manually")).toBeVisible();
    await sheet.getByLabel("Reason").fill("Checked the company registry; the domain moved last month.");
    await sheet.getByRole("button", { name: "Approve with note" }).click();
    await expect(page.getByText("No pending verifications")).toBeVisible();
    await openAdmin(page, "/admin/audit");
    await expect(page.getByText(/approved after manual review: Checked the company registry/)).toBeVisible();
  });

  test("desktop sidebar includes Verification nav item", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openAdmin(page, "/admin");
    await expect(page.locator('aside a[href="/admin/verification"]')).toBeVisible();
  });
});
