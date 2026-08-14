import { test, expect } from "@playwright/test";
import { attachMonitor, hasHorizontalOverflow } from "../../utils/monitor";
import {
  PUBLIC_ROUTES,
  TALENT_ROUTES,
  RECRUITER_ROUTES,
  COMPANY_ADMIN_ROUTES,
  HIRING_MANAGER_ROUTES,
  PLATFORM_ADMIN_ROUTES,
  type RouteEntry,
} from "../../utils/routes";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * @smoke @navigation
 *
 * Every static route this app has (per ROUTES.md/PAGE-INVENTORY.md), visited by its correct
 * role, checked for: HTTP failure, unexpected console/page/network errors (spec §19-20), a
 * non-blank body (spec §5 - "no route should be considered passing merely because it returned
 * HTTP 200"), and horizontal overflow at the current viewport (spec §15/§17 - reuses the same
 * scrollWidth/clientWidth check STABILIZE-REPORT.md's own mobile sweep already validated as
 * authoritative). Runs across all three projects (desktop-chromium, mobile-chromium/Pixel 7,
 * mobile-webkit/iPhone 13) automatically - no per-viewport duplication needed in this file.
 */

function runGroup(groupName: string, routes: RouteEntry[]) {
  test.describe(groupName, () => {
    for (const route of routes) {
      test(`${route.path} — ${route.label}`, async ({ page }) => {
        const monitor = attachMonitor(page);

        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        // Real navigation settle time, not an arbitrary guess - matches the 2s figure
        // STABILIZE-REPORT.md's own click-sweep found necessary to clear this app's GSAP route
        // transition without generating false timeouts.
        await page.waitForTimeout(2000);

        expect(response, `${route.path} produced no response`).toBeTruthy();
        expect(response!.status(), `${route.path} returned an error status`).toBeLessThan(400);

        // A route "renders" only if it has real visible content, not just a non-empty <body>
        // shell (spec §5's explicit "the page must actually render correctly" requirement).
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.trim().length, `${route.path} rendered with no visible text content`).toBeGreaterThan(0);

        const overflow = await hasHorizontalOverflow(page);
        expect(overflow, `${route.path} has horizontal overflow at this viewport`).toBe(false);

        await page.screenshot({
          path: `test-results/screenshots/${test.info().project.name}/${route.path.replace(/\//g, "_") || "root"}.png`,
          fullPage: false,
        });

        const problems = monitor.unexpected();
        expect(problems, `${route.path} had unexpected console/page/network errors:\n${problems.join("\n")}`).toEqual(
          [],
        );
      });
    }
  });
}

test.describe("Public routes (logged out)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  runGroup("Public", PUBLIC_ROUTES);
});

test.describe("Talent routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });
  runGroup("Talent", TALENT_ROUTES);
});

test.describe("Recruiter routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.recruiter.storageStatePath });
  runGroup("Recruiter", RECRUITER_ROUTES);
});

test.describe("Company Admin routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.company_admin.storageStatePath });
  runGroup("Company Admin", COMPANY_ADMIN_ROUTES);
});

test.describe("Hiring Manager routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.hiring_manager.storageStatePath });
  runGroup("Hiring Manager", HIRING_MANAGER_ROUTES);
});

test.describe("Platform Admin routes", () => {
  test.use({ storageState: DEMO_ACCOUNTS.platform_admin.storageStatePath });
  runGroup("Platform Admin", PLATFORM_ADMIN_ROUTES);
});
