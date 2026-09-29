import { test, expect } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

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

test.describe("Platform admin — B+ admin routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.platform_admin.storageStatePath });

  for (const { path, heading } of ADMIN_ROUTES) {
    test(`${path} renders for platform_admin`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`), { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Preview data").first()).toBeVisible();
    });
  }

  test("desktop sidebar includes Verification nav item", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Verification" })).toBeVisible();
  });
});
