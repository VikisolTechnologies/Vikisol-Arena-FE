import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("landing describes the network and does not invent a count", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /A network for needs, people/ })).toBeVisible();
  await expect(page.getByText("Jenny helps when there is something real to say.")).toBeVisible();
  await expect(page.getByText("₹62,000")).toHaveCount(0);
  await expect(page.getByText(/job board/i)).toHaveCount(0);
  await expect(page.getByText(/senior React developer/i)).toHaveCount(0);
});
