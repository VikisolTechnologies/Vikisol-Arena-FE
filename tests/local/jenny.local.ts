import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P8 — Jenny. Real API mode (`api`, not "mixed"). MARATHON-FE area 9: rows 42-47 are all
// PROPOSED v2 (docs/FE-API-GAPS.md) - the JennySol v1 gateway doesn't expose any of them yet, so
// `JENNY_PREVIEW` (= `FIXTURES_ALLOWED`, `src/lib/data/jenny.ts`) is false in `api` mode and every
// one of these screens already shows its own honest "Jenny can't do this yet" state (confirmed
// reading each: `JennyDraftScreen.tsx`, `JennyScreen.tsx`'s automations tab,
// `AutomationScreen.tsx`, `ShortlistScreen.tsx`) or simply omits the enhancement with no fake
// output (`JennyNoticedCard` on Feed, the "Jenny understood" card on Discover, the whole
// "Needs your approval" tab on Work - `loadQueue()` returns `[]`, so `WorkScreen.tsx` never
// renders that tab or `JennyWorkSections` at all). This file used to exercise the v2 fixture
// flow end to end; rewritten to assert the real, now-hidden behaviour instead - not deleted, not
// loosened, per the mission's own instruction.

type Call = { method: string; path: string; body: unknown };

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

async function setup(page: Page, calls: Call[]) {
  const profile = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Product Designer", industry: "Design", location: "", homeCity: "Gachibowli", remote: false, skills: [{ name: "Figma" }, { name: "UX Research" }], experienceYears: 6, rateFloor: 10, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    calls.push({ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null });
    let data: unknown = [];
    if (path === "/feed") data = [];
    else if (path === "/posts/joined" || path === "/posts/mine") data = { content: [], totalElements: 0, totalPages: 1, number: 0, size: 100 };
    else if (path === "/jobs") data = { content: [], totalElements: 0, totalPages: 1, number: 0, size: 200 };
    else if (path === "/applications" && req.method() === "GET") data = { content: [], totalElements: 0, totalPages: 1, number: 0, size: 100 };
    else if (path.startsWith("/profile/me")) data = profile;
    else if (path.includes("/search")) data = { query: "", activities: [], discussions: [], jobs: [], projects: [], companies: [], people: [] };
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

test("Work: no 'Needs your approval' tab or queue — row 43 is v2, not live", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/work?tab=approval");
  // The tab itself is filtered out of TABS (WorkScreen.tsx) when JENNY_PREVIEW is false, so this
  // URL just lands on the default view - no approval heading, no queue, no crash.
  await expect(page.getByRole("button", { name: /Needs approval/ })).toHaveCount(0);
  for (const h of ["Needs your approval", "Jenny can handle", "Waiting on others"]) {
    await expect(page.getByRole("heading", { name: h })).toHaveCount(0);
  }
  await noSeriousA11y(page);
});

test("Agent: automations tab shows the honest empty state — row 46 is v2, not live", async ({ page }) => {
  await setup(page, []);
  await page.goto("/agent?tab=automations");
  await expect(page.getByText("No automations yet")).toBeVisible();
  await expect(page.getByText(/When Jenny can watch for things on your behalf/)).toBeVisible();
  await noSeriousA11y(page);
});

test("Create with Jenny: an honest empty state, not an invented draft — row 42 is v2, not live", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto(`/agent/draft?q=${encodeURIComponent("Need two volunteers for lake cleanup Saturday at Gachibowli Lake")}`);
  await expect(page.getByText("Jenny can't draft posts yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Post a Need" })).toBeVisible();
  // No post-like data was invented from the typed sentence.
  expect(calls.filter((c) => c.method === "POST" && c.path.startsWith("/posts"))).toEqual([]);
  await noSeriousA11y(page);
});

test("Discover: no 'Jenny understood your request' card — row 42 is v2, not live", async ({ page }) => {
  await setup(page, []);
  await page.goto(`/discover?q=${encodeURIComponent("I want a beginner badminton game this weekend")}`);
  await expect(page.getByRole("region", { name: "Jenny understood your request" })).toHaveCount(0);
  // The plain search box still works - typed text carries through, nothing invented in its place.
  await expect(page.getByPlaceholder("Search people, activities, skills…")).toHaveValue("I want a beginner badminton game this weekend");
  await noSeriousA11y(page);
});

test("Feed: no 'Jenny noticed' card — row 44 is v2, not live", async ({ page }) => {
  await setup(page, []);
  await page.goto("/home");
  await expect(page.getByRole("region", { name: "Jenny noticed" })).toHaveCount(0);
  await noSeriousA11y(page);
});

test("Job search automation: the honest 'coming' state, not the fixture recipe — row 46/47 are v2, not live", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/identity/career/automation");
  await expect(page.getByText("Job search with Jenny is coming")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse jobs" })).toBeVisible();
  // No automation switches exist to misfire a real application from.
  await expect(page.getByRole("switch")).toHaveCount(0);
  expect(calls.filter((c) => c.method === "POST" && c.path === "/applications")).toEqual([]);
  await noSeriousA11y(page);
});

test("Shortlist: the honest 'no shortlist yet' state, consistent with Automation's own — row 47 is v2, not live", async ({ page }) => {
  await setup(page, []);
  await page.goto("/identity/career/shortlist");
  await expect(page.getByText("No shortlist yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse jobs" })).toBeVisible();
  // No invented match percentages or counts.
  await expect(page.getByText(/\d+\s?%/)).toHaveCount(0);
  await noSeriousA11y(page);
});
