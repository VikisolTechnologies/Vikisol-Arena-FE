import { test, expect } from "@playwright/test";

// A 401 the token refresh can't recover from shows the session-expired sheet, drops the session
// record, and leaves drafts on the device. Real API mode, calls intercepted.
test("401 with a failed refresh shows the session-expired sheet and keeps drafts", async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/refresh")) return route.fulfill({ status: 401, json: { success: false, message: "expired" } });
    if (path.includes("/profile/me")) return route.fulfill({ status: 401, json: { success: false, message: "expired" } });
    await route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_jwt_token", "stale");
    localStorage.setItem("arena_onboarded", "true");
    localStorage.setItem("arena_entry_draft", JSON.stringify({ intro: "my unsaved words" }));
  });
  await page.goto("/settings");
  const sheet = page.getByRole("dialog", { name: "Your session expired" });
  await expect(sheet).toBeVisible({ timeout: 15_000 });
  await expect(sheet.getByText("Your draft is still on this device.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("arena_session"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("arena_entry_draft"))).toContain("my unsaved words");
  // Portaled outside the app shell: it must carry its own theme (an opaque sheet, not the tab bar
  // showing through it) and sit above the tab bar with both buttons reachable.
  const panelBg = await sheet.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(panelBg).not.toMatch(/rgba\(.*,\s*0\)|transparent/);
  for (const name of ["Sign in again", "Stay here"]) {
    const box = await sheet.getByRole("button", { name }).boundingBox();
    expect(box).not.toBeNull();
    const coveredBy = await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y)?.closest("[role=dialog]") ? "dialog" : "other"), { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
    expect(coveredBy, `${name} is covered`).toBe("dialog");
  }
  await sheet.getByRole("button", { name: "Sign in again" }).click();
  await expect(page).toHaveURL(/\/auth/);
});
