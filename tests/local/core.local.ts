import { test, expect, type Page } from "@playwright/test";

// B+ P2 — Core (Feed, Discover + map mode, Work, You, Jenny, Create sheet). Real API mode with
// every call intercepted; asserts structure and behaviour, not seeded content.

async function stubApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.includes("/profile/me")) data = { id: "person-1", name: "Priya Sharma", avatarEmoji: "a", title: "", industry: "Engineering", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
    if (path.endsWith("/agent/conversation")) data = { id: "c1", title: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (path.includes("/search")) data = { query: "", activities: [], discussions: [], jobs: [], projects: [], companies: [] };
    await route.fulfill({ json: { success: true, data } });
  });
}

test.beforeEach(async ({ page }) => {
  await stubApi(page);
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
});

test("the bottom bar is Feed · Discover · (+) · Work · You, with no Map or Jenny tab", async ({ page }) => {
  await page.goto("/home");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link")).toHaveText(["Feed", "Discover", "Work", "You"]);
  await expect(nav.getByRole("button", { name: "Create" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Feed" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Real people. Real things happening nearby.")).toBeVisible();
});

test("Create sheet: six options, Esc closes, focus returns to (+)", async ({ page }) => {
  await page.goto("/home");
  const plus = page.getByRole("button", { name: "Create" });
  await plus.click();
  const sheet = page.getByRole("dialog", { name: "Create" });
  await expect(sheet.getByRole("heading", { name: "What do you want to make happen?" })).toBeVisible();
  for (const option of ["Post a Need", "Make an Offer", "Create an Activity", "Start a Project", "Post a Job", "Ask Jenny"]) {
    await expect(sheet.getByRole("button", { name: new RegExp(option) })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(plus).toBeFocused();
});

test("Discover switches to map mode and back; the privacy note is always shown", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  await page.getByRole("button", { name: "Show on a map" }).click();
  await expect(page).toHaveURL(/view=map/);
  await expect(page.getByText("Approximate location for your privacy")).toBeVisible();
  await page.getByRole("button", { name: "Show as a list" }).click();
  await expect(page).not.toHaveURL(/view=map/);
});

test("Work, You and Jenny render honest states", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Work" })).toBeVisible();
  await expect(page.getByText("Nothing in progress yet")).toBeVisible();
  await page.goto("/identity");
  await expect(page.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();
  await expect(page.getByText("Online")).toHaveCount(0);
  await page.goto("/agent");
  await expect(page.getByRole("heading", { name: "Jenny" })).toBeVisible();
  // No real reply yet: no invented Online/Offline status.
  await expect(page.getByRole("status").filter({ hasText: /Online|Offline/ })).toHaveCount(0);
});
