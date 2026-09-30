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
      if (path.startsWith("/account/")) {
        await expect(page.getByText("Preview data").first()).toBeVisible();
      }
    });
  }

  test("delete account requires confirmation tick", async ({ page }) => {
    await openAsPerson(page, "/account/delete");
    await expect(page.getByText("What happens")).toBeVisible();
    const del = page.getByRole("button", { name: /Delete my account forever/ });
    await expect(del).toBeVisible();
    // Disabled (and aria-disabled) until the confirmation box is ticked.
    await expect(del).toBeDisabled();
    await expect(del).toHaveAttribute("aria-disabled", "true");
    // The input is visually hidden; people tick it by pressing its label.
    const box = page.getByRole("checkbox", { name: /I understand this can.t be undone/ });
    await page.getByText(/I understand this can.t be undone/).click();
    await expect(box).toBeChecked();
    await expect(del).toBeEnabled();
    await expect(del).toHaveAttribute("aria-disabled", "false");
    await page.getByText(/I understand this can.t be undone/).click();
    await expect(box).not.toBeChecked();
    await expect(del).toBeDisabled();
  });

  test("every account page has its own title", async ({ page }) => {
    const titles: Record<string, string> = {
      "/account/session-expired": "Session expired · Arena",
      "/account/edit": "Edit profile · Arena",
      "/account/notifications": "Notification preferences · Arena",
      "/account/blocked": "Blocked accounts · Arena",
      "/account/export": "Download my data · Arena",
      "/account/delete": "Delete account · Arena",
      "/account/help": "Help & safety · Arena",
      "/account/share": "Share profile · Arena",
    };
    for (const [path, title] of Object.entries(titles)) {
      await openAsPerson(page, path);
      await expect(page).toHaveTitle(title);
    }
  });

  // Architect call (30 Sep, merging P11): canonical public-profile URL is /people/[id];
  // /neighbour/[id] (this branch's B+ page) redirects there instead of the reverse.
  test("/neighbour/:id redirects to the canonical /people/:id", async ({ page }) => {
    const response = await page.goto("/neighbour/n-arjun");
    expect(response?.url()).toContain("/people/n-arjun");
  });
});
