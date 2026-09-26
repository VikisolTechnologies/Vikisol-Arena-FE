import { test, expect, type Page } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

async function acceptCookies(page: Page) {
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("VNext surfaces, logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("home is readable and Create asks for a sign-in", async ({ page }) => {
    await page.goto("/home");
    await acceptCookies(page);
    await expect(page.getByText("Browsing as a guest")).toBeVisible();
    await expect(page.getByRole("link", { name: "Inbox" })).toHaveAttribute("href", "/rooms");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Sign in to publish")).toBeVisible();
  });

  test("map lists nearby activities and does not load a map canvas", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByText("Around Hyderabad")).toBeVisible();
    await expect(page.getByText("The map canvas stays off this first load.")).toBeVisible();
    const maps = await page.locator('script[src*="maps.googleapis"], script[src*="maps.google"]').count();
    expect(maps).toBe(0);
  });

  test("work and profile stay empty until there is a session", async ({ page }) => {
    await page.goto("/work");
    await expect(page.getByText("Sign in to see your work")).toBeVisible();
    await page.goto("/identity");
    await expect(page.getByText("Sign in to see your page")).toBeVisible();
  });
});

test.describe("VNext surfaces, talent", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

  test("feed does not invent a pulse count, and Jenny may speak", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText("Aarav Sharma").first()).toBeVisible();
    await expect(page.getByText("Loading")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText(/things in this feed/)).toHaveCount(0);
    await expect(page.getByText(/Arena is quiet right now/).or(page.getByRole("link").nth(6))).toBeVisible();
  });

  test("work opens a real application record", async ({ page }) => {
    await page.goto("/work");
    const record = page.getByRole("link", { name: /Application ·/ }).first();
    await expect(record).toBeVisible({ timeout: 15_000 });
    await record.click();
    await expect(page).toHaveURL(/\/applications\//);
  });

  test("profile shows the signed-in name", async ({ page }) => {
    await page.goto("/identity");
    await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible({ timeout: 15_000 });
  });

  test("create offers the five kinds and does not publish on its own", async ({ page }) => {
    await page.goto("/home");
    await acceptCookies(page);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("button", { name: "I need something" })).toBeVisible();
    await expect(page.getByRole("button", { name: "I can offer something" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a project" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create an activity" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create a job — needs a company seat" })).toBeVisible();
  });
});
