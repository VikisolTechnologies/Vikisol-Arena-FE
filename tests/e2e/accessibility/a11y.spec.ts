import { test } from "@playwright/test";
import { scan } from "../../utils/axe-scan";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * @accessibility — axe-core scan (spec §18) across a representative set of high-traffic pages,
 * not the full 45-route inventory yet (see TESTING.md's "what's not covered" for the honest
 * scope line). Critical/serious violations are hard failures; moderate/minor are reported via
 * attachment but don't fail the run - keeps the signal on "someone using a screen reader/keyboard
 * genuinely cannot do X" rather than drowning it in low-severity noise on day one.
 */

test.describe("Public pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ["/", "/auth", "/pricing"]) {
    test(`${path}`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForTimeout(1000);
      await scan(page, testInfo);
    });
  }
});

test.describe("Talent pages", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

  for (const path of ["/home", "/identity", "/settings", "/discover"]) {
    test(`${path}`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForTimeout(1000);
      await scan(page, testInfo);
    });
  }
});

test.describe("Enterprise pages", () => {
  test.use({ storageState: DEMO_ACCOUNTS.recruiter.storageStatePath });

  test("/enterprise/dashboard", async ({ page }, testInfo) => {
    await page.goto("/enterprise/dashboard");
    await page.waitForTimeout(1000);
    await scan(page, testInfo);
  });
});
