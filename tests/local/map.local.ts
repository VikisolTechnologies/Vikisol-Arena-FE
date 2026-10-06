import { test, expect } from "@playwright/test";

// Architect decision 30 Sep: the live map (MapLibre + OpenFreeMap) is primary; if its tiles can't
// load, the static launch-zone basemap takes over. Either way OpenStreetMap is credited and the
// approximate-location note stays. Real API mode, calls intercepted; tiles blocked here.

test("map falls back to the static basemap when tiles fail, still credited and private", async ({ page }) => {
  await page.route("**/tiles.openfreemap.org/**", (r) => r.abort());
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.includes("/profile/me")
      ? { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual", approxLat: 17.44, approxLng: 78.35 }
      : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
  await page.goto("/discover?view=map");
  await expect(page.locator('img[src*="launch-zone"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("© OpenStreetMap contributors")).toBeVisible();
  await expect(page.getByText("Approximate location for your privacy")).toBeVisible();
});
