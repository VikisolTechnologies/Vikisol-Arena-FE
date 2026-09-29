import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P8 — Jenny (the active layer + the job-search automation). Real API mode ("mixed" data), every
// call intercepted. Asserts the approve-first rules: nothing leaves the account without a tap,
// the undo line is hidden unless reversible, "Never submit without my approval" can't be removed,
// sample items never send, and Jenny's drafts only pre-fill the real intake.

type Call = { method: string; path: string; body: unknown };
const now = () => new Date().toISOString();
const inDays = (d: number, h: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};
const post = (id: string, over: Record<string, unknown>) => ({
  id, itemType: "activity", authorUserId: "u2", authorName: "Ananya Rao", body: "", tags: [], mediaUrls: [], status: "open", createdAt: now(),
  visibility: "approval", capacity: 8, spotsFilled: 3, approxLat: 17.4412, approxLng: 78.3522, locationText: "Gachibowli", ...over,
});
const job = (id: string, over: Record<string, unknown> = {}) => ({ id, title: "UX Designer", company: "Bluepeak Software", companyEmoji: "b", industry: "Design", location: "Kondapur, Hyderabad", remote: true, employmentType: "Full Time", salaryMin: 14, salaryMax: 20, skills: ["Figma", "UX Research", "Prototyping"], description: "Design clear flows.", postedDaysAgo: 2, matchPercentage: 0, ...over });

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

async function setup(page: Page, calls: Call[]) {
  let apps: Record<string, unknown>[] = [];
  const profile = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Product Designer", industry: "Design", location: "", homeCity: "Gachibowli", remote: false, skills: [{ name: "Figma" }, { name: "UX Research" }], experienceYears: 6, rateFloor: 10, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
  const saturday = (6 - new Date().getDay() + 7) % 7 || 7;
  const feed = [
    post("p-bad", { title: "Beginner-friendly badminton", body: "Relaxed doubles for beginners.", tags: ["badminton"], startsAt: inDays(saturday, 10), endsAt: inDays(saturday, 12) }),
    post("p-clean", { title: "Lake clean-up", body: "Gloves provided. Volunteers welcome.", tags: ["volunteering"], startsAt: inDays(saturday, 7), authorName: "Arjun Nair" }),
  ];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    calls.push({ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null });
    let data: unknown = [];
    if (path === "/feed") data = feed;
    else if (path === "/posts/joined" || path === "/posts/mine") data = { content: [], totalElements: 0, totalPages: 1, number: 0, size: 100 };
    else if (path === "/posts/p-clean") data = { ...feed[1], intentType: "activity", audience: "global", joinable: true, commentCount: 0, reactionCount: 4, authorJoinCount: 3, authorAccountAgeDays: 90, demoContent: false };
    else if (path === "/jobs") data = { content: [job("j1"), job("j2", { title: "Backend Developer", skills: ["Java"] })], totalElements: 2, totalPages: 1, number: 0, size: 200 };
    else if (path === "/jobs/j1") data = job("j1");
    else if (path === "/applications" && req.method() === "GET") data = { content: apps, totalElements: apps.length, totalPages: 1, number: 0, size: 100 };
    else if (path === "/applications" && req.method() === "POST") {
      const a = { id: "a1", jobId: "j1", stage: "APPLIED", appliedAt: now(), updatedAt: now() };
      apps = [a];
      data = a;
    } else if (path.endsWith("/agent/conversation")) data = { id: "c1", title: null, createdAt: now(), updatedAt: now() };
    else if (path.startsWith("/profile/me")) data = profile;
    else if (path.includes("/search")) data = { query: "", activities: [], discussions: [], jobs: [], projects: [], companies: [] };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
    localStorage.setItem("arena_entry_draft", JSON.stringify({ intents: ["activities"], area: "Gachibowli / Gopanapally", useCurrentLocation: false, interests: ["Badminton", "Volunteering"], displayName: "Priya Sharma", title: "Product Designer", intro: "", availability: ["Weekends"] }));
  });
}

test("Work: Jenny's queue; approving a sample item sends nothing; no undo line unless reversible", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/work?tab=approval");
  for (const h of ["Needs your approval (3)", "Jenny can handle (2)", "Waiting on others (3)"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: /Review: Respond to community invite/ }).click();
  const sheet = page.getByRole("dialog", { name: "Approve action" });
  await expect(sheet.getByText("Send this message?")).toBeVisible();
  await expect(sheet.getByText("Exact location is not shared.")).toBeVisible();
  await expect(sheet.getByText(/undo this within 10 minutes/)).toHaveCount(0);
  await noSeriousA11y(page);
  const before = calls.length;
  await sheet.getByRole("button", { name: "Approve and send" }).click();
  await expect(sheet.getByText("Sample item — nothing was sent")).toBeVisible();
  expect(calls.slice(before).filter((c) => c.method !== "GET")).toEqual([]);
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("heading", { name: "Needs your approval (2)" })).toBeVisible();
});

test("Jenny can handle: turning an automation off removes what it prepared", async ({ page }) => {
  await setup(page, []);
  await page.goto("/work?tab=approval");
  await page.getByRole("button", { name: "Options for Add to your calendar" }).click();
  await page.getByRole("button", { name: /Turn off/ }).click();
  await expect(page.getByRole("heading", { name: "Jenny can handle (1)" })).toBeVisible();
  await page.goto("/agent?tab=automations");
  await expect(page.getByRole("switch", { name: "Add relevant events to calendar" })).toHaveAttribute("aria-checked", "false");
});

test("Create with Jenny: the draft only pre-fills the real intake, which lands on what's missing", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto(`/agent/draft?q=${encodeURIComponent("Need two volunteers for lake cleanup Saturday at Gachibowli Lake")}`);
  await expect(page.getByText("Drafted by Jenny")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lake clean-up volunteers" })).toBeVisible();
  await expect(page.getByText("Please add a time and confirm capacity before publishing.")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.waitForURL(/\/activities\/new\?step=details/);
  await expect(page.getByLabel("Title")).toHaveValue("Lake clean-up volunteers");
  await expect(page.getByText("Jenny filled — check").first()).toBeVisible();
  await page.goBack();
  // "Preview & approve" opens the intake on the first step that still needs an answer.
  await page.getByRole("button", { name: "Preview & approve" }).click();
  await page.waitForURL(/start=bring/);
  await expect(page.getByRole("heading", { name: "Before they come" })).toBeVisible();
  expect(calls.filter((c) => c.method === "POST" && c.path.startsWith("/posts"))).toEqual([]);
});

test("Discover: a sentence becomes editable filters; results explain themselves", async ({ page }) => {
  await setup(page, []);
  await page.goto(`/discover?q=${encodeURIComponent("I want a beginner badminton game this weekend")}`);
  const card = page.getByRole("region", { name: "Jenny understood your request" });
  await expect(card.getByRole("button", { name: /Activity: Badminton/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Skill level: Beginner/ })).toBeVisible();
  await expect(page.getByText("Showing 1 result near Gachibowli")).toBeVisible();
  await expect(page.getByRole("link", { name: /Beginner-friendly badminton/ })).toBeVisible();
  await card.getByRole("button", { name: /Activity: Badminton/ }).click();
  await page.getByRole("radio", { name: "Any activity" }).click();
  await expect(page.getByText("Showing 2 results near Gachibowli")).toBeVisible();
  await page.getByRole("button", { name: /Why these results/ }).click();
  await expect(page.getByText(/never ranked by a score/)).toBeVisible();
});

test("Feed and smart match: reasons, never a score", async ({ page }) => {
  await setup(page, []);
  await page.goto("/home");
  const noticed = page.getByRole("region", { name: "Jenny noticed" });
  await expect(noticed.getByText(/opportunit/)).toBeVisible();
  await noticed.getByRole("link", { name: /Lake clean-up/ }).click();
  await expect(page.getByRole("heading", { name: "Why this matches you?" })).toBeVisible();
  await expect(page.getByText("Matches your interest in volunteering")).toBeVisible();
  await expect(page.getByText(/\d+\s?%/)).toHaveCount(0);
  await noSeriousA11y(page);
});

test("Job search: Never is fixed; shortlist shows counts; apply happens only on Approve & submit", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/identity/career/automation");
  await page.getByRole("button", { name: /Submit any application without my approval/ }).click();
  await expect(page.getByText("This one can't be switched off")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit automation" }).click();
  await expect(page.getByRole("dialog", { name: "Edit automation" }).getByRole("switch")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Turn on automation" }).click();

  await page.waitForURL(/\/identity\/career\/shortlist/);
  await expect(page.getByText("1 role for you · newest first")).toBeVisible();
  await expect(page.getByText("Matches 2")).toBeVisible();
  await expect(page.getByText(/\d+\s?%/)).toHaveCount(0);
  await noSeriousA11y(page);
  await page.getByRole("link", { name: /UX Designer/ }).click();

  await expect(page.getByRole("heading", { name: "Review application" })).toBeVisible();
  expect(calls.filter((c) => c.method === "POST" && c.path === "/applications")).toEqual([]);
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Approve & submit" }).click();
  await page.waitForURL(/\/applications\/a1/);
  expect(calls.filter((c) => c.method === "POST" && c.path === "/applications").map((c) => c.body)).toEqual([{ jobId: "j1" }]);
  await expect(page.getByText(/as approved by you/)).toBeVisible();
  await expect(page.getByText(/I'll keep an eye on the response/)).toBeVisible();
});
