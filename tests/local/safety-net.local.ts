import { test, expect, type Page } from "@playwright/test";

/**
 * MARATHON-FE Step 1: every route must render without a fixture and without crashing in `api`
 * mode. `src/lib/dev/screens.json`'s own `route` field always points at a `/dev/*` preview-
 * harness URL (e.g. `/dev/screen/activity-cancel`) — and `/dev/*` pages don't exist at all in
 * `api` mode (`next.config.ts`'s `PREVIEW_OFF` drops every `*.dev.tsx` page from the build), so
 * literally crawling those routes here would just crawl 404s by design, not a safety net.
 * Decision (standing order: decide, write it down, keep going): crawl the real route tree
 * instead — every `page.tsx` under `src/app` (excluding `/dev/*`, which production never
 * ships) — since that's the actual set of routes a real visitor or signed-in user can reach.
 * A dynamic segment gets a syntactically-plausible but nonexistent id; the expectation there is
 * an honest "not found" / empty state, not a 200 with invented data.
 */

const STATIC_ROUTES = [
  "/",
  "/access-denied",
  "/account/blocked",
  "/account/delete",
  "/account/edit",
  "/account/export",
  "/account/help",
  "/account/notifications",
  "/account/session-expired",
  "/account/share",
  "/activities/new",
  "/admin",
  "/admin/analytics",
  "/admin/audit",
  "/admin/content",
  "/admin/disputes",
  "/admin/flags",
  "/admin/jenny",
  "/admin/moderation",
  "/admin/team",
  "/admin/tenants",
  "/admin/users",
  "/admin/verification",
  "/agent",
  "/agent/draft",
  "/applications",
  "/applications/new",
  "/aup",
  "/auth",
  "/auth/forgot",
  "/companies",
  "/discover",
  "/discuss",
  "/discuss/communities",
  "/enterprise",
  "/enterprise/admin",
  "/enterprise/admin/audit",
  "/enterprise/admin/billing",
  "/enterprise/admin/company",
  "/enterprise/admin/consent",
  "/enterprise/admin/team",
  "/enterprise/candidates",
  "/enterprise/dashboard",
  "/enterprise/interviews",
  "/enterprise/interviews/mine",
  "/enterprise/messages",
  "/enterprise/onboarding",
  "/enterprise/postings",
  "/enterprise/postings/new",
  "/enterprise/posts",
  "/enterprise/talent",
  "/home",
  "/identity",
  "/identity/career",
  "/identity/career/automation",
  "/identity/career/jenny",
  "/identity/career/shortlist",
  "/identity/edit",
  "/invite/not-a-real-token",
  "/jobs",
  "/map",
  "/marketplace",
  "/marketplace/bids",
  "/messages",
  "/needs/new",
  "/notifications",
  "/offers/new",
  "/onboarding",
  "/pricing",
  "/privacy",
  "/projects/new",
  "/reset-password",
  "/rooms",
  "/search",
  "/settings",
  "/terms",
  "/work",
  "/work/saved",
];

const DYNAMIC_ROUTES = [
  "/agent/match/not-a-real-id",
  "/applications/not-a-real-id",
  "/auth/invite/not-a-real-token",
  "/auth/reset/not-a-real-token",
  "/companies/not-a-real-id",
  "/discuss/c/not-a-real-slug",
  "/enterprise/interviews/not-a-real-id",
  "/enterprise/interviews/mine/not-a-real-id",
  "/enterprise/postings/not-a-real-id",
  "/enterprise/postings/not-a-real-id/candidates/not-a-real-id",
  "/enterprise/talent/not-a-real-id",
  "/feed/not-a-real-id",
  "/interviews/not-a-real-id",
  "/jobs/not-a-real-id",
  "/marketplace/not-a-real-id",
  "/marketplace/not-a-real-id/manage",
  "/messages/not-a-real-id",
  "/people/not-a-real-id",
  "/rooms/not-a-real-id",
];

// Next's own dev-mode error overlay / a thrown-but-uncaught exception. A handled "not found" or
// "can't reach Arena" state is text on the page, not one of these signals.
async function crashSignals(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

function isNoiseError(text: string) {
  // Third-party/dev-only noise this app already tolerates elsewhere, not a sign the route itself
  // is broken: a Google Maps/Sign-In script with no API key configured in this environment, and
  // Next's own dev-only warnings.
  return /google|maps|hydrat|favicon|ResizeObserver|Failed to load resource/i.test(text);
}

for (const route of STATIC_ROUTES) {
  test(`safety net (static): ${route}`, async ({ page }) => {
    const { pageErrors, consoleErrors } = await crashSignals(page);
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `${route} returned ${res?.status()}`).toBeLessThan(500);
    await page.waitForTimeout(400);
    await expect(page.locator("body")).not.toContainText("Application error");
    const realPageErrors = pageErrors.filter((e) => !isNoiseError(e));
    const realConsoleErrors = consoleErrors.filter((e) => !isNoiseError(e));
    expect(realPageErrors, `${route} threw: ${realPageErrors.join("; ")}`).toEqual([]);
    expect(realConsoleErrors, `${route} logged console errors: ${realConsoleErrors.join("; ")}`).toEqual([]);
  });
}

for (const route of DYNAMIC_ROUTES) {
  test(`safety net (dynamic, nonexistent id): ${route}`, async ({ page }) => {
    const { pageErrors, consoleErrors } = await crashSignals(page);
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `${route} returned ${res?.status()}`).toBeLessThan(500);
    await page.waitForTimeout(400);
    await expect(page.locator("body")).not.toContainText("Application error");
    const realPageErrors = pageErrors.filter((e) => !isNoiseError(e));
    const realConsoleErrors = consoleErrors.filter((e) => !isNoiseError(e));
    expect(realPageErrors, `${route} threw: ${realPageErrors.join("; ")}`).toEqual([]);
    expect(realConsoleErrors, `${route} logged console errors: ${realConsoleErrors.join("; ")}`).toEqual([]);
  });
}
