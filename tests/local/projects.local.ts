import { test, expect, type Page } from "@playwright/test";

// P6c — start a project (flow §7 PR1–PR2): paid publishes to the projects API; collaborative
// stays a device draft (nothing is sent) until the API supports roles and team rooms.

type Call = { method: string; path: string; body: unknown };

async function setup(page: Page, calls: Call[]) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/marketplace/projects" && req.method() === "POST") data = { id: "p1", ...(body as object), postedBy: "me", status: "open", endsAt: new Date().toISOString(), bids: [] };
    else if (path.startsWith("/profile/me")) data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
}

async function fillBasics(page: Page) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Lake clean-up map");
  await page.getByLabel("The goal").fill("A shared map of litter hotspots around Durgam Lake.");
  await page.getByRole("radio", { name: "Environment" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Roles" }).fill("2 designers");
  await page.getByRole("button", { name: "Add — Roles" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("paid project publishes with budget, duration and skills", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await fillBasics(page);
  await page.getByRole("radio", { name: "Paid — freelancers bid" }).click();
  await page.getByRole("textbox", { name: "Budget — from" }).fill("20000");
  await page.getByRole("textbox", { name: "Budget — to" }).fill("40000");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Publish project" }).click();
  await expect(page).toHaveURL(/\/marketplace\/p1/);
  expect(calls.find((c) => c.method === "POST" && c.path === "/marketplace/projects")?.body).toMatchObject({ title: "Lake clean-up map", budgetMin: 20000, budgetMax: 40000, durationWeeks: 6 });
});

test("collaborative project stays a draft and says so", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await fillBasics(page);
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText(/Collaborative projects open soon/)).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/work\?draft=project/);
  await expect(page.getByText(/Your project is saved on this device/)).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/marketplace/projects")).toBe(false);
});
