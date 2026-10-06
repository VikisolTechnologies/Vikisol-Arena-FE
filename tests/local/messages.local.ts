import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P5 — Messages, trust & everyday controls (Inbox, Conversation, Notifications, Search,
// Settings, Report/Block). Real API mode, every call intercepted; asserts the exact calls.

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
type Call = { method: string; path: string; body: unknown; query: string };
const profile = (over: Record<string, unknown> = {}) => ({ id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", homeCity: "Gachibowli", locationConsent: "city", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "supervised", ...over });

async function setup(page: Page, calls: Call[]) {
  let consent = { autoApply: false, searchableByEnterprises: false };
  let blocks = [{ userId: "u9", name: "Kabir Das", emoji: "k", blockedAt: ago(60 * 48) }];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body, query: url.search });
    let data: unknown = [];
    if (path === "/rooms") data = [
      { id: "r1", postId: "p1", postBody: "Sunrise Run at Durgam Lake", postIntentType: "activity", memberCount: 18, unread: true, muted: false, postStatus: "open", lastMessageAt: ago(10), lastMessagePreview: "Ananya: See you at 6:30!" },
      { id: "r2", postId: "p2", postBody: "Help move a sofa", postIntentType: "ask", memberCount: 2, unread: false, muted: false, postStatus: "open", lastMessageAt: ago(90), lastMessagePreview: "Rohit: Sounds good!" },
    ];
    else if (path === "/messages/conversations") data = [{ id: "c1", participantId: "u1", participantName: "Meera Iyer", participantEmoji: "m", lastMessageAt: ago(30), unread: false }];
    else if (path === "/messages/conversations/c1/messages" && req.method() === "GET") data = [
      { id: "t1", conversationId: "c1", fromMe: false, content: "Are you still joining this Saturday?", timestamp: ago(40) },
      { id: "t2", conversationId: "c1", fromMe: false, content: "Meeting link: https://meet.example.com/garden", timestamp: ago(35) },
    ];
    else if (path === "/messages/conversations/c1/messages") data = { id: "t3", conversationId: "c1", fromMe: true, content: (body as { content: string }).content, timestamp: ago(0) };
    else if (path === "/messages/conversations/c1/report") data = null;
    else if (path === "/blocks/u1" && req.method() === "POST") data = null;
    else if (path === "/blocks/me") data = blocks;
    else if (path === "/blocks/u9" && req.method() === "DELETE") { blocks = []; data = null; }
    else if (path === "/notifications") data = { content: [
      { id: "n1", type: "system", title: "New response to your need", body: "Rohit offered to help", timestamp: ago(20), read: false, link: "/rooms/r2" },
      { id: "n2", type: "interview", title: "Interview reminder", body: "Tomorrow at 3 PM", timestamp: ago(60 * 30), read: true, link: "/interviews/i1" },
    ], totalElements: 2, totalPages: 1, number: 0, size: 50 };
    else if (path === "/notifications/n1/read") data = null;
    else if (path === "/search") data = {
      query: url.searchParams.get("q"),
      activities: [{ id: "s1", authorUserId: "x", authorName: "A", authorEmoji: "a", intentType: "activity", title: "Garden walk", body: "", locationText: "Gopanapally", audience: "global", visibility: "public", spotsFilled: 0, status: "open", tags: [], mediaUrls: [], joinable: true, createdAt: ago(600), commentCount: 0, reactionCount: 0, authorJoinCount: 0, authorAccountAgeDays: 1, demoContent: false }],
      discussions: [{ id: "s2", authorUserId: "x", authorName: "B", authorEmoji: "b", intentType: "ask", title: "Help with garden maintenance", body: "", locationText: "Gachibowli", audience: "global", visibility: "approval", spotsFilled: 0, status: "open", tags: [], mediaUrls: [], joinable: true, createdAt: ago(60), commentCount: 0, reactionCount: 0, authorJoinCount: 0, authorAccountAgeDays: 1, demoContent: false }],
      jobs: [], projects: [], companies: [],
    };
    else if (path === "/profile/me/consent") { consent = body as typeof consent; data = profile({ consent }); }
    else if (path.startsWith("/profile/me")) data = profile({ consent });
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
}

test("inbox: rooms and chats newest first, filters and search", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/rooms");
  const list = page.getByRole("list", { name: "Conversations" });
  await expect(list.getByRole("link")).toHaveCount(3);
  await expect(list.getByRole("link").first()).toContainText("Sunrise Run at Durgam Lake");
  await expect(list.getByRole("link").first().getByRole("img", { name: "Unread" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("radio", { name: "Needs" }).click();
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list.getByRole("link")).toContainText("Help move a sofa");
  await page.getByRole("radio", { name: "All" }).click();
  await page.getByRole("button", { name: "Search conversations" }).click();
  await page.getByRole("textbox", { name: "Search conversations" }).fill("meera");
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list.getByRole("link")).toContainText("Meera Iyer");
});

test("conversation: meeting link card, send, report with a reason and block", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/messages/c1");
  await expect(page.getByRole("heading", { name: "Meera Iyer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open link" })).toHaveAttribute("href", "https://meet.example.com/garden");
  await noSeriousA11y(page);
  await page.getByLabel("Write a message").fill("See you there");
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => calls.some((c) => c.method === "POST" && c.path === "/messages/conversations/c1/messages")).toBe(true);

  await page.getByRole("button", { name: "Report" }).last().click();
  const sheet = page.getByRole("dialog", { name: "Report a problem" });
  await sheet.getByRole("button", { name: "Submit report" }).click();
  await expect(sheet.getByText("Choose the closest reason.")).toBeVisible();
  expect(calls.some((c) => c.path.endsWith("/report"))).toBe(false);
  await sheet.getByText("Spam or unsolicited contact").click();
  await sheet.getByText("Also block Meera").click();
  await noSeriousA11y(page);
  await sheet.getByRole("button", { name: "Submit report" }).click();
  await expect(sheet.getByRole("heading", { name: "Thanks for telling us" })).toBeVisible();
  expect(calls.find((c) => c.path === "/messages/conversations/c1/report")?.body).toEqual({ reason: "Spam or unsolicited contact" });
  expect(calls.some((c) => c.method === "POST" && c.path === "/blocks/u1")).toBe(true);
});

test("notifications: today and earlier; mark read calls the API", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/notifications");
  await expect(page.getByRole("region", { name: "Today" }).getByText("New response to your need")).toBeVisible();
  await expect(page.getByRole("region", { name: "Earlier" }).getByText("Interview reminder")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Mark read" }).click();
  await expect(page.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  expect(calls.some((c) => c.method === "PUT" && c.path === "/notifications/n1/read")).toBe(true);
  await page.getByRole("radio", { name: "Jobs" }).click();
  await expect(page.getByText("Interview reminder")).toBeVisible();
  await expect(page.getByText("New response to your need")).toHaveCount(0);
});

test("search: most recent first, and Needs shows only asks", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/search");
  await page.getByRole("searchbox", { name: "Search Arena" }).fill("garden");
  const results = page.getByRole("list", { name: "Search results" });
  await expect(results.getByRole("link")).toHaveCount(2);
  await expect(page.getByText("Most recent first")).toBeVisible();
  await expect(results.getByRole("link").first()).toContainText("Help with garden maintenance");
  await noSeriousA11y(page);
  await page.getByRole("radio", { name: "Needs" }).click();
  await expect(results.getByRole("link")).toHaveCount(1);
  expect(calls.some((c) => c.path === "/search" && c.query.includes("type=discussions"))).toBe(true);
});

test("settings: career visibility saves; blocked accounts can be unblocked", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings & Privacy" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: /Career visibility/ }).click();
  const career = page.getByRole("dialog", { name: "Career visibility" });
  await career.getByRole("switch", { name: "Visible to employers" }).click();
  await expect(career.getByRole("switch", { name: "Visible to employers" })).toHaveAttribute("aria-checked", "true");
  expect(calls.find((c) => c.path === "/profile/me/consent")?.body).toEqual({ autoApply: false, searchableByEnterprises: true });
  await page.keyboard.press("Escape");
  // Blocked accounts is a full page now (/account/blocked), no longer an inline sheet.
  await page.getByRole("link", { name: /Blocked accounts/ }).click();
  await expect(page).toHaveURL(/\/account\/blocked/);
  await expect(page.getByRole("heading", { name: "Blocked accounts", level: 1 })).toBeVisible();
  await expect(page.getByText("Kabir Das")).toBeVisible();
  await page.getByRole("button", { name: "Unblock" }).click();
  await expect(page.getByText("No one blocked")).toBeVisible();
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/blocks/u9")).toBe(true);
});
