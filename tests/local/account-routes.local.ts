import { test, expect, type Page } from "@playwright/test";

// Ported from tests/e2e/account/account-routes.spec.ts (the mock-mode route-smoke suite,
// run via the now-deleted playwright.mock.config.ts + /dev/person). Real API mode, stubbed at
// the route level like every other tests/local/*.local.ts file - no /dev/* sign-in shortcut.

const ROUTES = [
  { path: "/account/edit", heading: "Edit profile" },
  { path: "/account/notifications", heading: "Notification preferences" },
  { path: "/account/blocked", heading: "Blocked accounts" },
  { path: "/account/export", heading: "Download my data" },
  { path: "/account/delete", heading: "Delete account" },
  { path: "/account/help", heading: "Help & safety" },
  { path: "/account/share", heading: "Share profile" },
] as const;

const TITLES: Record<string, string> = {
  "/account/edit": "Edit profile · Arena",
  "/account/notifications": "Notification preferences · Arena",
  "/account/blocked": "Blocked accounts · Arena",
  "/account/export": "Download my data · Arena",
  "/account/delete": "Delete account · Arena",
  "/account/help": "Help & safety · Arena",
  "/account/share": "Share profile · Arena",
};

async function signedIn(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, "");
    let data: unknown = null;
    if (path === "/notifications/preferences") data = { messages: true, activities: true, needs: true, jobs: true, jenny: false, marketing: false };
    else if (path === "/blocks") data = [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com", candidateId: "c-priya" }));
    localStorage.setItem("arena_jwt_token", "test-token");
    localStorage.setItem("arena_onboarded", "true");
  });
}

test.describe("Account routes render with the right heading and title", () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders`, async ({ page }) => {
      await signedIn(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveTitle(TITLES[path]);
    });
  }
});

test("delete account requires confirmation tick", async ({ page }) => {
  await signedIn(page);
  await page.goto("/account/delete");
  await expect(page.getByText("What happens")).toBeVisible();
  const del = page.getByRole("button", { name: /Delete my account forever/ });
  await expect(del).toBeVisible();
  await expect(del).toBeDisabled();
  await expect(del).toHaveAttribute("aria-disabled", "true");
  const box = page.getByRole("checkbox", { name: /I understand this can.t be undone/ });
  await page.getByText(/I understand this can.t be undone/).click();
  await expect(box).toBeChecked();
  await expect(del).toBeEnabled();
  await expect(del).toHaveAttribute("aria-disabled", "false");
  await page.getByText(/I understand this can.t be undone/).click();
  await expect(box).not.toBeChecked();
  await expect(del).toBeDisabled();
});

// Architect call (30 Sep, merging P11): canonical public-profile URL is /people/[id];
// /neighbour/[id] redirects there instead of the reverse.
test("/neighbour/:id redirects to the canonical /people/:id", async ({ page }) => {
  await signedIn(page);
  const response = await page.goto("/neighbour/n-arjun");
  expect(response?.url()).toContain("/people/n-arjun");
});
