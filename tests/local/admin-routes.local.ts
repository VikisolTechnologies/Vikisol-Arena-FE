import { test, expect, type Page } from "@playwright/test";

// Ported from tests/e2e/admin/admin-routes.spec.ts (the mock-mode route-smoke suite, run via
// the now-deleted playwright.mock.config.ts + /dev/admin). Real API mode, stubbed at the route
// level. Only the generic "route renders with the right heading/title" + nav-presence coverage
// is ported - the original suite's fixture-specific behavioral tests (a particular mismatched-
// domain company existing by default, "Pending not Paused" wording, a "pricing beta banner"
// flag existing, a gap-number text scan) either depend on mock-only seeded content with no
// real-backend equivalent, or were already exercised live against the real backend in
// MARATHON-FE-2 Step B (verification approve/reject, moderation, users, disputes, industries,
// flags - see docs/missions/REPORTS.md's Step B entry) and don't need a second, weaker,
// stub-only copy here.

const ADMIN_ROUTES = [
  { path: "/admin", heading: "Overview", title: "Overview" },
  { path: "/admin/verification", heading: "Verification queue", title: "Verification" },
  { path: "/admin/moderation", heading: "Moderation", title: "Moderation" },
  { path: "/admin/users", heading: "Users", title: "Users" },
  { path: "/admin/tenants", heading: "Companies", title: "Companies" },
  { path: "/admin/content", heading: "Content", title: "Content" },
  { path: "/admin/disputes", heading: "Disputes", title: "Disputes" },
  { path: "/admin/jenny", heading: "Jenny & AI oversight", title: "Jenny & AI" },
  { path: "/admin/analytics", heading: "Analytics", title: "Analytics" },
  { path: "/admin/flags", heading: "Feature flags", title: "Feature flags" },
  { path: "/admin/audit", heading: "Audit log", title: "Audit log" },
  { path: "/admin/team", heading: "Admin team", title: "Admin team" },
  { path: "/admin/industries", heading: "Industries", title: "Industries" },
] as const;

async function signedInAdmin(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, "");
    let data: unknown = [];
    if (path === "/admin/verification") data = [];
    else if (path === "/admin/moderation") data = [];
    else if (path === "/admin/users") data = [];
    else if (path === "/admin/tenants") data = [];
    else if (path === "/admin/disputes") data = [];
    else if (path === "/admin/flags") data = [];
    else if (path === "/admin/industries") data = [];
    else if (path === "/admin/analytics") data = { tenantsTotal: 0, tenantsSuspended: 0, tenantsByPlan: {}, usersTotal: 0, usersByRole: {}, postingsTotal: 0, postingsOpen: 0, applicationsTotal: 0, interviewsTotal: 0, newTenantsLast7d: 0, newUsersLast7d: 0 };
    else if (path === "/admin/dashboard") data = { tenantsTotal: 0, tenantsSuspended: 0, usersTotal: 0, moderationPending: 0, recentActivity: [] };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "platform_admin", name: "Platform Admin", email: "admin@example.com" }));
    localStorage.setItem("arena_jwt_token", "test-token");
    localStorage.setItem("arena_onboarded", "true");
  });
}

test.describe("Admin routes render with the right heading and title", () => {
  for (const { path, heading, title } of ADMIN_ROUTES) {
    test(`${path} renders for platform_admin`, async ({ page }) => {
      await signedInAdmin(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveTitle(`${title} · Arena Admin`);
    });
  }
});

test("desktop sidebar includes Verification nav item", async ({ page }) => {
  await signedInAdmin(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/admin");
  await expect(page.locator('aside a[href="/admin/verification"]')).toBeVisible();
});
