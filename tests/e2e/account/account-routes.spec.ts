import { test, expect } from "@playwright/test";

/**
 * P11 account & people routes in MOCK mode via /dev/person.
 * Run: npx playwright test -c playwright.mock.config.ts tests/e2e/account
 */
const ROUTES = [
  { path: "/account/session-expired", heading: "Session expired" },
  { path: "/account/edit", heading: "Edit profile" },
  { path: "/account/notifications", heading: "Notification preferences" },
  { path: "/account/blocked", heading: "Blocked accounts" },
  { path: "/account/export", heading: "Download my data" },
  { path: "/account/delete", heading: "Delete account" },
  { path: "/account/help", heading: "Help & safety" },
  { path: "/account/share", heading: "Share profile" },
  { path: "/neighbour/n-arjun", heading: "Arjun Nair" },
  { path: "/neighbour/n-hidden", heading: "Private profile" },
] as const;

async function openAsPerson(page: import("@playwright/test").Page, path: string) {
  await page.goto(`/dev/person?to=${encodeURIComponent(path)}`);
  await page.waitForURL((url) => url.pathname === path || url.pathname.startsWith(`${path}/`), {
    timeout: 30_000,
  });
}

test.describe("Account & people — P11 (mock)", () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders`, async ({ page }) => {
      await openAsPerson(page, path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
      if (path.startsWith("/account/") || path.startsWith("/neighbour/")) {
        await expect(page.getByText("Preview data").first()).toBeVisible();
      }
    });
  }

  test("delete account requires confirmation tick", async ({ page }) => {
    await openAsPerson(page, "/account/delete");
    await expect(page.getByText("What happens")).toBeVisible();
    await expect(page.getByRole("button", { name: /Delete my account forever/ })).toBeVisible();
  });
});
