import { test, expect } from "@playwright/test";

/** Review 4 follow-ups: specimen clock times stay the fixture's own, and a Hired applicant's interview card shows the outcome. */

for (const id of ["activity-manage", "activity-checkin", "activity-cancel"]) {
  test(`${id} keeps the run at 6:30 AM, only the date moves`, async ({ page }) => {
    await page.goto(`/dev/screen/${id}`);
    await expect(page.getByText("Sunrise Run").first()).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).toMatch(/6:30\s?AM/i);
    expect(text).not.toMatch(/\b1:(00|30)\s?AM/i);
  });
}

test("interview of a Hired applicant shows the outcome, not pending slots", async ({ page }) => {
  await page.goto("/dev/business?to=/enterprise/interviews/demo-app-5");
  await page.waitForURL((u) => u.pathname === "/enterprise/interviews/demo-app-5", { timeout: 30_000 });
  await expect(page.getByText("Lakshmi is hired")).toBeVisible();
  await expect(page.getByText(/Waiting for Lakshmi to pick a time/)).toHaveCount(0);
});
