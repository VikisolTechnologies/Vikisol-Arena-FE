import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * @accessibility — axe-core scan (spec §18) across a representative set of high-traffic pages,
 * not the full 45-route inventory yet (see TESTING.md's "what's not covered" for the honest
 * scope line). Critical/serious violations are hard failures; moderate/minor are reported via
 * attachment but don't fail the run - keeps the signal on "someone using a screen reader/keyboard
 * genuinely cannot do X" rather than drowning it in low-severity noise on day one.
 */

async function scan(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo) {
  const results = await new AxeBuilder({ page }).analyze();

  await testInfo.attach("axe-results.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const bySeverity = (impact: string) => results.violations.filter((v) => v.impact === impact);
  const critical = bySeverity("critical");
  const serious = bySeverity("serious");
  const moderate = bySeverity("moderate");
  const minor = bySeverity("minor");

  testInfo.annotations.push({
    type: "a11y-summary",
    description: `critical=${critical.length} serious=${serious.length} moderate=${moderate.length} minor=${minor.length}`,
  });

  const describe = (v: (typeof results.violations)[number]) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`;

  expect(critical.map(describe), "critical accessibility violations").toEqual([]);
  expect(serious.map(describe), "serious accessibility violations").toEqual([]);
}

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
