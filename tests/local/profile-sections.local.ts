import { test, expect } from "@playwright/test";

const me = {
  id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Designer", industry: "Design", location: "",
  homeCity: "Bandra", remote: false, skills: [{ name: "Drawing" }], experienceYears: 2, rateFloor: 0, openTo: [],
  careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual", bio: "Hello",
};

async function stub(page: import("@playwright/test").Page, opts: { hidden?: boolean; withPost?: boolean }) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.includes("/profile/me")) data = me;
    else if (path.includes("/profile/someone")) data = { ...me, id: "someone", name: "Asha Rao", visibility: opts.hidden ? "hidden" : "everyone" };
    else if (path.includes("/profile/") && path.endsWith("/stats")) data = { hosted: opts.withPost ? 1 : 0, joined: 0, helped: 0, projects: 0 };
    else if (path.endsWith("/posts/joined")) data = { content: [], totalElements: 0 };
    else if (path.includes("/posts/by-user/") || path.endsWith("/posts/mine")) {
      data = { content: opts.withPost ? [{ id: "post-1", title: "Sunday sketch", body: "Bring paper", intentType: "activity", status: "open", mediaUrls: [], tags: [], spotsFilled: 0, createdAt: new Date().toISOString(), authorUserId: "me" }] : [], totalElements: opts.withPost ? 1 : 0 };
    }
    else if (path.includes("/projects/of/")) data = opts.withPost ? [{ postId: "proj-1", title: "Lake map", status: "open", role: "Host", createdAt: new Date().toISOString(), contributor: false }] : [];
    else if (path.includes("/needs/outcomes/")) data = [];
    else if (path.includes("/bids")) data = [];
    await route.fulfill({ json: { success: true, data } });
  });
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com", candidateId: "me" }));
    localStorage.setItem("arena_onboarded", "true");
    sessionStorage.setItem("arena_location_session", "1");
  });
}

test("You shows your posts and empty sections", async ({ page }) => {
  await stub(page, { withPost: true });
  await signIn(page);
  await page.goto("/identity");
  await expect(page.getByRole("region", { name: "Hosted activities" }).getByText("Sunday sketch")).toBeVisible();
  await expect(page.getByRole("region", { name: "Projects" }).getByText("Lake map")).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs and offers" }).getByText("No needs or offers yet.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Joined activities" }).getByText("No joined activities yet.")).toBeVisible();
});

test("a public profile shows the same sections and a hidden one stays hidden", async ({ page }) => {
  await stub(page, { withPost: true });
  await signIn(page);
  await page.goto("/people/someone");
  await expect(page.getByRole("heading", { name: "Asha Rao" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Hosted activities" }).getByText("Sunday sketch")).toBeVisible();
  await expect(page.getByRole("region", { name: "Completed needs and offers" }).getByText("Nothing completed yet.")).toBeVisible();

  await page.unroute("**/api/v1/**");
  await stub(page, { hidden: true });
  await page.goto("/people/someone");
  await expect(page.getByText("This profile isn't available")).toBeVisible();
  await expect(page.getByText("Sunday sketch")).toHaveCount(0);
});
