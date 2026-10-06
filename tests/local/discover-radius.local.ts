import { test, expect } from "@playwright/test";

// The discover map's distance control is 2–50 km and starts at 5. It changes which places
// are drawn and which appear in the list under the map.

test("the map distance slider starts at 5 km and widens the list", async ({ page }) => {
  const radii: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.includes("/posts/nearby")) radii.push(url.searchParams.get("radiusKm") ?? "");
    let data: unknown = [];
    if (path.includes("/profile/me")) {
      data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual", approxLat: 17.44, approxLng: 78.35 };
    }
    if (path.includes("/posts/nearby")) {
      data = [
        { id: "near", title: "Evening walk", body: "A short loop", intentType: "activity", approxLat: 17.441, approxLng: 78.35, status: "open", mediaUrls: [], tags: [], spotsFilled: 1, createdAt: new Date().toISOString() },
        { id: "far", title: "Far picnic", body: "A long way off", intentType: "activity", approxLat: 17.62, approxLng: 78.35, status: "open", mediaUrls: [], tags: [], spotsFilled: 1, createdAt: new Date().toISOString() },
      ];
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
    sessionStorage.setItem("arena_location_session", "1");
  });
  await page.goto("/map");
  const slider = page.getByRole("slider", { name: "Distance" });
  await expect(slider).toHaveValue("5");
  await expect(page.getByRole("list", { name: "Places in this distance" }).getByText("Evening walk")).toBeVisible();
  await expect(page.getByText("Far picnic")).toHaveCount(0);
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="Distance"]') as HTMLInputElement | null;
    if (!input) throw new Error("Distance slider missing");
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    set?.call(input, "30");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByText("Far picnic")).toBeVisible();
  await expect.poll(() => radii.at(-1)).toBe("30");
  await expect(page.locator("[data-radius-km]")).toHaveAttribute("data-radius-km", "30");
});
