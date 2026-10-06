import { test, expect, type Page } from "@playwright/test";

// Nearby means within 5 km of the person's own approximate point. Without that point, the feed
// asks for a location instead of guessing a city. Other-city items appear only under All.

const now = new Date().toISOString();
const item = (id: string, title: string, lat?: number, lng?: number, locationText?: string) => ({
  id, itemType: "activity", title, body: title, tags: [], mediaUrls: [], status: "open", createdAt: now,
  approxLat: lat, approxLng: lng, locationText, joinable: true, spotsFilled: 3, capacity: 10,
});

async function setup(page: Page, items: unknown[], me?: { lat: number; lng: number }) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/feed")) data = items;
    if (path.includes("/profile/me")) data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual", approxLat: me?.lat, approxLng: me?.lng };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
}

test("the feed opens on All", async ({ page }) => {
  await setup(page, [item("b", "Carter Road walk", 19.0596, 72.8295, "Bandra, Mumbai")]);
  await page.goto("/home");
  await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
  await expect(page.getByText("Carter Road walk")).toBeVisible();
});

test("Nearby shows only items within 5 km of the person; other cities only under All", async ({ page }) => {
  await setup(page, [
    item("a", "Badminton at the stadium", 17.4468, 78.3486, "Gachibowli Stadium"),
    item("b", "Carter Road walk", 19.0596, 72.8295, "Bandra, Mumbai"),
    item("c", "Named but no point", undefined, undefined, "Somewhere"),
  ], { lat: 17.4401, lng: 78.3489 });
  await page.goto("/home");
  await page.getByRole("radio", { name: "Nearby" }).click();
  await expect(page.getByRole("heading", { name: "Badminton at the stadium" })).toBeVisible();
  await expect(page.getByText("Carter Road walk")).toHaveCount(0);
  await expect(page.getByText("Named but no point")).toHaveCount(0);
  await page.getByRole("radio", { name: "All" }).click();
  await expect(page.getByText("Carter Road walk")).toBeVisible();
});

test("without a location, Nearby asks instead of guessing a city", async ({ page }) => {
  await setup(page, [item("a", "Badminton at the stadium", 17.4468, 78.3486, "A stadium")]);
  await page.goto("/home");
  await page.getByRole("radio", { name: "Nearby" }).click();
  await expect(page.getByText("Where should Arena look?")).toBeVisible();
  await expect(page.getByText("Badminton at the stadium")).toHaveCount(0);
});

test("an empty Nearby is honest and offers Create / Widen", async ({ page }) => {
  await setup(page, [item("b", "Carter Road walk", 19.0596, 72.8295, "Bandra, Mumbai")], { lat: 17.4401, lng: 78.3489 });
  await page.goto("/home");
  await page.getByRole("radio", { name: "Nearby" }).click();
  await expect(page.getByText("Nothing within 5 km yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an activity" })).toBeVisible();
  await page.getByRole("button", { name: "Widen to 15 km" }).click();
  await expect(page.getByText("Nothing within 15 km yet")).toBeVisible();
  await expect(page.getByText("Carter Road walk")).toHaveCount(0);
});
