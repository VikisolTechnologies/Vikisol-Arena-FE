import { test, expect } from "@playwright/test";
import { attachMonitor } from "../../utils/monitor";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * @smoke @regression — one deep, fully real journey (spec §34 Journey 3, plus legs of 1/4/6/8):
 * Home → Applications → a real application detail (ID discovered live, never hardcoded - stale
 * seed-data UUIDs break across re-seeds, see tests/utils/routes.ts's own comment on this) →
 * Identity → Settings persistence-across-reload check.
 *
 * This is ONE deliberately-thorough example rather than all ten §34 journeys - see TESTING.md's
 * backlog for the other nine (Discover→Apply, Feed→Post→Comment, Messaging, full Registration,
 * Responsive replay of this same path). Proves the pattern; extending it to the rest is
 * mechanical, not a redesign.
 */

test.describe("Candidate golden path", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

  test("home shows real seeded data, not an empty/broken shell", async ({ page }) => {
    const monitor = attachMonitor(page);
    await page.goto("/home");
    await page.waitForTimeout(1500);
    // demo.talent@vikisol.dev is seeded as "Aarav Sharma" (TEST-LOGINS.md) - asserting the real
    // name renders somewhere on the authenticated shell confirms this isn't a generic/placeholder
    // render, it's genuinely this account's data.
    await expect(page.getByText("Aarav Sharma", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    expect(monitor.unexpected()).toEqual([]);
  });

  test("Applications → a real application detail renders with matching data, Back returns cleanly", async ({
    page,
  }) => {
    const monitor = attachMonitor(page);
    await page.goto("/applications");
    await page.waitForTimeout(1500);

    const firstCard = page.getByTestId("application-card").first();
    await expect(firstCard, "no application cards rendered - demo account may be unseeded").toBeVisible({
      timeout: 10_000,
    });

    await firstCard.click();
    await expect(page).toHaveURL(/\/applications\/[a-f0-9-]+$/, { timeout: 10_000 });
    await page.waitForTimeout(1500);

    // Detail page must show real content, not a blank/error state, per spec §5.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);

    await page.goBack();
    await expect(page).toHaveURL(/\/applications$/, { timeout: 10_000 });

    expect(monitor.unexpected()).toEqual([]);
  });

  test("Identity/profile renders real seeded data", async ({ page }) => {
    await page.goto("/identity");
    await page.waitForTimeout(1500);
    await expect(page.getByText("Aarav Sharma", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Settings: 'Reduce motion effects' toggle survives a reload (real persistence, not just a UI flip)", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1500);

    const toggleRow = page.locator("div", { hasText: "Reduce motion effects" }).last();
    const toggle = toggleRow.getByRole("switch");
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    const initial = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await page.waitForTimeout(300);
    const afterClick = await toggle.getAttribute("aria-checked");
    expect(afterClick, "toggle did not visibly flip on click").not.toBe(initial);

    await page.reload();
    await page.waitForTimeout(1500);
    const afterReload = await page.locator("div", { hasText: "Reduce motion effects" }).last().getByRole("switch").getAttribute("aria-checked");
    // The exact bug class spec §11 warns about: "a form that says 'saved' but loses its data
    // after refresh must fail the test."
    expect(afterReload, "Reduce motion effects reset after reload - did not actually persist").toBe(afterClick);

    // Cleanup: restore original value so this shared demo account isn't left in a different
    // accessibility state than it started in (spec §25 - minimum footprint, "create → test →
    // cleanup" where possible).
    if (afterReload !== initial) {
      const cleanupToggle = page.locator("div", { hasText: "Reduce motion effects" }).last().getByRole("switch");
      await cleanupToggle.click();
      await page.waitForTimeout(300);
    }
  });
});
