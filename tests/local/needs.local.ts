import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P4 — Need → outcome (post a need, offers of help, accept → private room, meeting link,
// mark as completed, helper's side). Real API mode, every call intercepted; asserts exact calls.

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 160) + " " + (n.failureSummary ?? "").slice(0, 200)).join(" | ")}`)).toEqual([]);
}

const now = () => new Date().toISOString();
const need = (over: Record<string, unknown> = {}) => ({
  id: "need-1", authorUserId: "me", authorName: "Priya Sharma", authorEmoji: "p", intentType: "ask",
  title: "Help move a sofa", body: "Two people, about an hour. Elevator at both places.", locationText: "Gachibowli",
  audience: "global", visibility: "approval", spotsFilled: 0, status: "open", tags: ["Moving & Heavy Lifting"], mediaUrls: [],
  joinable: true, mine: true, createdAt: now(), commentCount: 0, reactionCount: 0, authorJoinCount: 3, authorAccountAgeDays: 90, demoContent: false,
  ...over,
});

type Call = { method: string; path: string; body: unknown };

async function setup(page: Page, post: Record<string, unknown>, calls: Call[]) {
  let current = { ...post };
  let joins = [{ id: "j1", postId: "need-1", userId: "u-rohit", userName: "Rohit Kumar", userEmoji: "r", status: "pending", createdAt: now() }];
  const messages: Record<string, unknown>[] = [{ id: "m1", roomId: "room-9", senderUserId: "u-rohit", senderName: "Rohit Kumar", senderEmoji: "r", fromMe: false, content: "Happy to help on Saturday.", createdAt: now() }];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/posts" && req.method() === "POST") data = (current = need({ ...(body as object), id: "need-1" }));
    else if (path === "/posts/need-1" && req.method() === "GET") data = current;
    else if (path === "/posts/need-1/joins" && req.method() === "GET") data = joins;
    else if (path === "/posts/need-1/joins" && req.method() === "POST") {
      current = { ...current, myJoinStatus: "pending" };
      data = { id: "j2", postId: "need-1", userId: "me", userName: "Priya", userEmoji: "p", status: "pending", createdAt: now() };
    } else if (path === "/posts/need-1/joins/me") {
      current = { ...current, myJoinStatus: undefined };
      data = { id: "j2", postId: "need-1", userId: "me", userName: "Priya", userEmoji: "p", status: "withdrawn", createdAt: now() };
    } else if (path === "/posts/need-1/joins/j1/approve") {
      joins = joins.map((j) => ({ ...j, status: "approved" }));
      current = { ...current, roomId: "room-9", spotsFilled: 1 };
      data = joins[0];
    } else if (path === "/posts/need-1/status") data = (current = { ...current, status: "closed" });
    else if (path === "/profile/u-rohit") data = { id: "u-rohit", name: "Rohit Kumar", avatarEmoji: "r", title: "Works at a product company", industry: "Engineering", location: "", remote: false, skills: [{ name: "Running" }], experienceYears: 5, openTo: [], careerHealth: 0, bio: "Kind, reliable and always down to help.", verificationLevel: "phone", phoneVerified: true, homeCity: "Gachibowli", followerCount: 1, followingCount: 1 };
    else if (path === "/rooms") data = [{ id: "room-9", postId: "need-1", postBody: "Help move a sofa", postIntentType: "ask", memberCount: 2, unread: false, muted: false, postStatus: "open", lastMessageAt: now() }];
    else if (path === "/rooms/room-9/messages" && req.method() === "GET") data = messages;
    else if (path === "/rooms/room-9/messages") {
      const msg = { id: `m${messages.length + 1}`, roomId: "room-9", senderUserId: "me", senderName: "Priya Sharma", senderEmoji: "p", fromMe: true, content: (body as { content: string }).content, createdAt: now() };
      messages.push(msg);
      data = msg;
    } else if (path === "/rooms/room-9/members") data = [{ userId: "me", name: "Priya Sharma", emoji: "p", role: "admin" }, { userId: "u-rohit", name: "Rohit Kumar", emoji: "r", role: "member" }];
    else if (path.startsWith("/profile/me")) data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Engineering", location: "", homeCity: "Gachibowli", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
    localStorage.removeItem("arena_need_draft");
  });
}

test("post a need: validation after submit, then a real POST and the need page", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need(), calls);
  await page.goto("/needs/new");
  await expect(page.getByRole("heading", { name: "Post a Need" })).toBeVisible();
  await expect(page.getByLabel("Where (approximate area)")).toHaveValue("Gachibowli");
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Post Need" }).click();
  await expect(page.getByText("Say what you need help with, in a few words.")).toBeVisible();
  await expect(page.getByText("Pick the closest category.")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/posts")).toBe(false);

  await page.getByLabel("What do you need help with?").fill("Help move a sofa");
  await page.getByLabel("Category").selectOption("Moving & Heavy Lifting");
  await page.getByLabel("Preferred time").selectOption("This weekend");
  await page.getByRole("button", { name: "Post Need" }).click();
  await expect(page).toHaveURL(/\/feed\/need-1/);
  const post = calls.find((c) => c.method === "POST" && c.path === "/posts")!.body as Record<string, unknown>;
  expect(post).toMatchObject({ intentType: "ask", title: "Help move a sofa", visibility: "approval", tags: ["Moving & Heavy Lifting"], locationText: "Gachibowli" });
  expect(post.startsAt).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Help move a sofa" })).toBeVisible();
});

test("owner: offer → details → accept opens the private room; meeting link; mark as completed", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need(), calls);
  await page.goto("/feed/need-1");
  await expect(page.getByRole("heading", { name: "Offers of help (1)" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: /Rohit Kumar/ }).click();
  const sheet = page.getByRole("dialog", { name: "Offer details" });
  await expect(sheet.getByText("Kind, reliable and always down to help.")).toBeVisible();
  await noSeriousA11y(page);
  await sheet.getByRole("button", { name: "Accept & open chat" }).click();
  await expect(page).toHaveURL(/\/rooms\/room-9/);
  expect(calls.some((c) => c.method === "PUT" && c.path === "/posts/need-1/joins/j1/approve")).toBe(true);

  await expect(page.getByText("Private coordination room")).toBeVisible();
  await expect(page.getByText("Only you and Rohit can see this chat.")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Add meeting link" }).click();
  const link = page.getByRole("dialog", { name: "Add meeting link" });
  await link.getByLabel("Meeting link").fill("meet.example.com/x");
  await link.getByRole("button", { name: "Share link" }).click();
  await expect(link.getByText(/Paste a full https:\/\/ link/)).toBeVisible();
  await link.getByLabel("Meeting link").fill("https://meet.example.com/abc");
  await link.getByRole("button", { name: "Share link" }).click();
  await expect(page.getByRole("link", { name: "Open link" })).toHaveAttribute("href", "https://meet.example.com/abc");
  expect(calls.find((c) => c.method === "POST" && c.path === "/rooms/room-9/messages")?.body).toEqual({ content: "Meeting link: https://meet.example.com/abc" });

  await page.getByRole("button", { name: "Mark as completed" }).click();
  const done = page.getByRole("dialog", { name: "Mark as completed" });
  await done.getByRole("button", { name: "Yes, it's resolved" }).click();
  await expect(done.getByRole("heading", { name: "It's done!" })).toBeVisible();
  expect(calls.some((c) => c.method === "PUT" && c.path === "/posts/need-1/status")).toBe(true);
  await noSeriousA11y(page);
});

test("helper: offer to help, then withdraw", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need({ mine: false, authorUserId: "someone", authorName: "Meera Iyer" }), calls);
  await page.goto("/feed/need-1");
  await expect(page.getByRole("heading", { name: "Offers of help" })).toHaveCount(0);
  await page.getByRole("button", { name: "Offer to help" }).click();
  await expect(page.getByText("Offer sent — Meera will review it")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/posts/need-1/joins")).toBe(true);
  await page.getByRole("button", { name: "Withdraw offer" }).click();
  await expect(page.getByRole("button", { name: "Offer to help" })).toBeVisible();
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/posts/need-1/joins/me")).toBe(true);
});
