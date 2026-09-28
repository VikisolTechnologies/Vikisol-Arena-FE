import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P6b — host an activity end to end (A1 kind → intake → cover → preview → publish → live).
// Real API mode, every call intercepted (including the image upload).

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

type Call = { method: string; path: string; body: unknown };

async function setup(page: Page, calls: Call[]) {
  await page.route("https://upload.example.test/**", (route) => route.fulfill({ json: { secure_url: "https://cdn.example.test/cover.webp" } }));
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() && !req.postData()!.startsWith("--") ? (() => { try { return req.postDataJSON(); } catch { return null; } })() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/media/upload-signature") data = { apiKey: "k", timestamp: 1, folder: "f", allowedFormats: "webp", signature: "s", uploadUrl: "https://upload.example.test/image" };
    else if (path === "/posts" && req.method() === "POST") data = { ...(body as object), id: "act-new", authorUserId: "me", authorName: "Priya", authorEmoji: "p", spotsFilled: 0, status: "open", joinable: true, mine: true, createdAt: new Date().toISOString(), commentCount: 0, reactionCount: 0, authorJoinCount: 0, authorAccountAgeDays: 1, demoContent: false };
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

test("host a cricket match: type questions, cover card, publish with the cover stored", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/activities/new");
  await expect(page.getByRole("heading", { name: "What kind of activity?" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("textbox", { name: "Search activity types" }).fill("crick");
  await page.getByRole("button", { name: /Cricket/ }).click();

  await expect(page.getByRole("heading", { name: "Cricket: the basics" })).toBeVisible();
  await page.getByLabel("Title").fill("Sunday tennis-ball cricket");
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Group & cost" })).toBeVisible();
  await page.getByRole("textbox", { name: "Group size — from" }).fill("10");
  await page.getByRole("textbox", { name: "Group size — to" }).fill("16");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "About the cricket" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose one to continue.")).toBeVisible();
  await page.getByRole("radio", { name: "Tennis-ball" }).click();
  await page.getByRole("radio", { name: "10" }).click();
  await page.getByRole("checkbox", { name: "Bat" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Before they come" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please confirm to continue.")).toBeVisible();
  await page.getByRole("switch", { name: "All joiners are 18+" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Date").fill("2026-10-18");
  await page.getByLabel("Starts").fill("07:00");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Area").fill("Gachibowli");
  await page.getByLabel("Exact meeting point").fill("Box arena gate 2");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Who can join" })).toBeVisible();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Choose a cover" }).click();

  await expect(page.getByRole("heading", { name: "Your cover" })).toBeVisible();
  await expect(page.getByText("Cover card · made for this activity")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Try another" }).click();
  await page.getByRole("button", { name: "Use this" }).click();

  await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("heading", { name: "It's live!" })).toBeVisible();

  const post = calls.find((c) => c.method === "POST" && c.path === "/posts")!.body as Record<string, unknown>;
  expect(post).toMatchObject({ intentType: "activity", title: "Sunday tennis-ball cricket", visibility: "approval", capacity: 16, locationText: "Gachibowli", exactMeetingPoint: "Box arena gate 2", mediaUrls: ["https://cdn.example.test/cover.webp"] });
  expect(post.tags).toEqual(expect.arrayContaining(["Sports", "Cricket", "All levels"]));
  expect(post.startsAt).toBe(new Date("2026-10-18T07:00:00+05:30").toISOString());
  expect(String(post.body)).toContain("Format: Tennis-ball");
  expect(String(post.body)).not.toContain("Box arena gate 2");
  await noSeriousA11y(page);
});
