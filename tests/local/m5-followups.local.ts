import { test, expect, type Page } from "@playwright/test";

// M5: the industry list comes from GET /public/industries (open, staff-managed), and Report on a
// public profile posts to POST /profile/{id}/report with the 400 / 404 messages. Real API mode.

const signIn = async (page: Page, session: object) => {
  await page.goto("/auth");
  await page.evaluate((s) => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify(s));
    localStorage.setItem("arena_jwt_token", "local-test-token");
    localStorage.setItem("arena_onboarded", "true");
    localStorage.setItem("arena_enterprise_onboarded", "true");
  }, session);
};

test("industry pickers offer the live list, not retired ones, and keep a retired value already on the record", async ({ page }) => {
  let industriesCalls = 0;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, "");
    let data: unknown = [];
    if (path === "/public/industries") {
      industriesCalls++;
      data = [{ key: "ENGINEERING", label: "Engineering" }, { key: "SALES", label: "Sales" }, { key: "COMMUNITY", label: "Community & nonprofit" }];
    } else if (path === "/enterprise/profile/me") {
      data = { companyName: "OldCo", logoEmoji: "o", industry: "Logistics", size: "11-50", hiringFor: [], plan: "pro", seatsUsed: 1, seatsTotal: 5, unlockCreditsUsed: 0, unlockCreditsTotal: 50, status: "active" };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await signIn(page, { role: "company_admin", name: "Alex Rao", email: "alex@oldco.example" });
  await page.goto("/enterprise/admin/company");
  const select = page.getByLabel("Industry");
  await expect(select).toBeVisible();
  await expect(select.locator("option", { hasText: "Community & nonprofit" })).toHaveCount(1);
  // Logistics was retired: not offered to others, but this company still has it and it shows as-is.
  await expect(select).toHaveValue("Logistics");
  await expect(select.locator("option")).toHaveText(["Engineering", "Sales", "Community & nonprofit", "Logistics"]);
  await expect(select.locator("option", { hasText: "Healthcare" })).toHaveCount(0);
  expect(industriesCalls).toBeGreaterThan(0);
});

for (const [status, message, shown] of [
  // M6 area 2: a 400 means two different things (self-report vs. a duplicate open report) with
  // the backend's own wording for each (ModerationService.fileUserReport) — the FE passes that
  // message straight through instead of guessing which one it was with one hardcoded string.
  [400, "You can't report yourself", "You can't report yourself"],
  [400, "You've already reported this person; Arena's team is looking at it", "You've already reported this person; Arena's team is looking at it"],
  [404, "Not found", "This profile isn't available"],
  [200, "Report submitted", "Thanks for telling us"],
] as const) {
  test(`reporting a person: ${status} shows "${shown}"`, async ({ page }) => {
    let posted: unknown = null;
    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
      if (path === "/profile/cand-9/report") {
        posted = req.postDataJSON();
        await route.fulfill({ status, json: { success: status === 200, message, data: null } });
        return;
      }
      const data = path === "/profile/cand-9"
        ? { id: "cand-9", name: "Meera Iyer", title: "Teacher", industry: "Sales", location: "Gachibowli", remote: false, skills: [], experienceYears: 3, openTo: [], careerHealth: 0, verificationLevel: "basic", phoneVerified: false, followerCount: 0, followingCount: 0, visibility: "everyone" }
        : [];
      await route.fulfill({ json: { success: true, data } });
    });
    await signIn(page, { role: "talent", name: "Test", userId: "me", candidateId: "me" });
    await page.goto("/people/cand-9");
    await page.getByRole("button", { name: "Report" }).click();
    const sheet = page.getByRole("dialog", { name: "Report a problem" });
    await sheet.getByText("Fake profile").click();
    await sheet.getByRole("button", { name: "Submit report" }).click();
    await expect(page.getByText(shown)).toBeVisible();
    expect(posted).toEqual({ reason: "Fake profile" });
  });
}
