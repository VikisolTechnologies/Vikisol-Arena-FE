import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P4 — Need → outcome (post a need, offers of help, accept → private conversation, mark as
// completed, helper's side). Real API mode, every call intercepted; asserts exact calls.
//
// MARATHON-FE area 4: rewritten from `/posts/{id}/joins*` + a post "room" to the real
// `/needs/{id}/...` endpoints and the 1:1 conversation `NeedService.accept()` actually opens
// (verified live: `post.myJoinStatus` and the generic join list are always empty for ASK/OFFER
// posts — a different table entirely, `NeedResponse`, not `PostJoinRequest`).

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

async function setup(page: Page, post: Record<string, unknown>, calls: Call[], opts: { existingResponse?: boolean } = {}) {
  const { existingResponse = true } = opts;
  let current = { ...post };
  let response: Record<string, unknown> | null = existingResponse
    ? { id: "r1", postId: "need-1", userId: "u-rohit", name: "Rohit Kumar", avatarEmoji: "r", message: "Happy to help!", status: "pending", createdAt: now() }
    : null;
  const conversations: Record<string, Record<string, unknown>[]> = { "conv-1": [{ id: "m1", conversationId: "conv-1", senderUserId: "u-rohit", senderName: "Rohit Kumar", senderEmoji: "r", fromMe: false, content: "Happy to help on Saturday.", createdAt: now() }] };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/posts" && req.method() === "POST") data = (current = need({ ...(body as object), id: "need-1" }));
    else if (path === "/posts/need-1" && req.method() === "GET") data = current;
    else if (path === "/needs/need-1/details") data = { postId: "need-1" };
    else if (path === "/needs/need-1" && req.method() === "GET") {
      data = {
        postId: "need-1", kind: current.intentType === "offer" ? "offer" : "need", category: "moving", status: current.status, responseCount: response ? 1 : 0,
        viewer: { owner: current.mine, myResponse: !current.mine && response?.userId === "me" ? response : undefined },
        answers: {},
      };
    } else if (path === "/needs/need-1/responses" && req.method() === "GET") data = response ? [response] : [];
    else if (path === "/needs/need-1/responses" && req.method() === "POST") {
      response = { id: "r1", postId: "need-1", userId: "me", name: "Priya", avatarEmoji: "p", message: (body as { message: string }).message, status: "pending", createdAt: now() };
      data = response;
    } else if (path === "/needs/need-1/responses/me") {
      response = null;
      data = { id: "r1", status: "withdrawn" };
    } else if (path === "/needs/need-1/responses/r1/accept") {
      response = { ...response, status: "accepted", conversationId: "conv-1" };
      current = { ...current, spotsFilled: 1 };
      data = response;
    } else if (path === "/needs/need-1/responses/r1/confirm") {
      response = { ...response, completion: { ownerConfirmedAt: now() } };
      data = response;
    } else if (path === "/profile/u-rohit") data = { id: "u-rohit", name: "Rohit Kumar", avatarEmoji: "r", title: "Works at a product company", industry: "Engineering", location: "", remote: false, skills: [{ name: "Running" }], experienceYears: 5, openTo: [], careerHealth: 0, bio: "Kind, reliable and always down to help.", verificationLevel: "phone", phoneVerified: true, homeCity: "Gachibowli", followerCount: 1, followingCount: 1 };
    else if (path === "/messages/conversations/conv-1/messages" && req.method() === "GET") data = conversations["conv-1"];
    else if (path === "/messages/conversations" && req.method() === "GET") data = [{ id: "conv-1", participantUserId: "u-rohit", participantName: "Rohit Kumar", participantEmoji: "r", lastMessage: "Happy to help on Saturday.", lastMessageAt: now(), unread: false }];
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

test("post a need: category → intake with validation → a real POST, then PUT /needs/{id}/details", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need(), calls);
  await page.goto("/needs/new");
  await expect(page.getByRole("heading", { name: "What kind of help?" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("link", { name: "Moving & heavy lifting" }).click();

  await expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("This one's needed to continue.")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/posts")).toBe(false);
  await page.getByLabel("In one line").fill("Help move a sofa");
  await page.getByRole("radio", { name: "This week" }).click();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Moving & heavy lifting" })).toBeVisible();
  await page.getByLabel("What needs moving").fill("3-seater sofa");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Area")).toHaveValue("Gachibowli");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("How neighbours see it")).toBeVisible();
  await page.getByRole("button", { name: "Post need" }).click();

  await expect(page).toHaveURL(/\/feed\/need-1/);
  const post = calls.find((c) => c.method === "POST" && c.path === "/posts")!.body as Record<string, unknown>;
  expect(post).toMatchObject({ intentType: "ask", title: "Help move a sofa", visibility: "approval", locationText: "Gachibowli", audience: "global" });
  expect(post.tags).toEqual(["Moving & heavy lifting", "This week"]);
  expect(String(post.body)).toContain("What needs moving: 3-seater sofa");
  expect(post.startsAt).toBeTruthy();
  // The structured truth now also goes to PUT /needs/{id}/details (MARATHON-FE area 4).
  expect(calls.some((c) => c.method === "PUT" && c.path === "/needs/need-1/details")).toBe(true);
  await expect(page.getByRole("heading", { name: "Help move a sofa" })).toBeVisible();
});

test("make an offer: category → what and when → a real offer post", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need({ intentType: "offer", title: "Maths tutoring" }), calls);
  await page.goto("/offers/new");
  await expect(page.getByRole("heading", { name: "What can you offer?" })).toBeVisible();
  await page.getByRole("link", { name: "Tutoring & mentoring" }).click();
  await page.getByLabel("In one line").fill("Maths tutoring for Class 8–10");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Weekends" }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Post offer" }).click();
  await expect(page).toHaveURL(/\/feed\/need-1/);
  const post = calls.find((c) => c.method === "POST" && c.path === "/posts")!.body as Record<string, unknown>;
  expect(post).toMatchObject({ intentType: "offer", title: "Maths tutoring for Class 8–10", visibility: "approval" });
  expect(String(post.body)).toContain("Days: Weekends");
  await expect(page.getByText("Requests (1)")).toBeVisible();
});

test("owner: offer → details → accept opens the private conversation; mark as completed", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need(), calls);
  await page.goto("/feed/need-1");
  await expect(page.getByRole("heading", { name: "Offers of help (1)" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: /Rohit Kumar/ }).click();
  // Offer details is a full page (board); the phone's Back returns to the need.
  await expect(page.getByRole("heading", { level: 1, name: "Offer details" })).toBeVisible();
  await expect(page.getByText("Kind, reliable and always down to help.")).toBeVisible();
  await noSeriousA11y(page);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Offers of help (1)" })).toBeVisible();
  await page.getByRole("button", { name: /Rohit Kumar/ }).click();
  await page.getByRole("button", { name: "Accept & open chat" }).click();
  // Accepting opens a private 1:1 conversation, not a post "room" (NeedService.accept() creates
  // a Conversation, never touches the post's roomId - verified live).
  await expect(page).toHaveURL(/\/messages\/conv-1/);
  expect(calls.some((c) => c.method === "PUT" && c.path === "/needs/need-1/responses/r1/accept")).toBe(true);

  await page.goto("/feed/need-1");
  await page.getByRole("button", { name: /Rohit Kumar/ }).click();
  await page.getByRole("button", { name: "Mark as completed" }).click();
  await expect(page.getByText("waiting for the other side to confirm too")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/needs/need-1/responses/r1/confirm")).toBe(true);
  await noSeriousA11y(page);
});

test("helper: offer to help (with a message), then withdraw", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, need({ mine: false, authorUserId: "someone", authorName: "Meera Iyer" }), calls, { existingResponse: false });
  await page.goto("/feed/need-1");
  await expect(page.getByRole("heading", { name: "Offers of help" })).toHaveCount(0);
  await page.getByRole("button", { name: "Offer to help" }).click();
  // PUT /needs/{id}/responses requires a message now (it didn't used to, via the generic join) -
  // the compose sheet is this mission's own addition.
  await expect(page.getByRole("heading", { name: "Meera will see this" })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Your message").fill("I can help Saturday morning.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Offer sent — Meera will review it")).toBeVisible();
  const sent = calls.find((c) => c.method === "POST" && c.path === "/needs/need-1/responses");
  expect(sent?.body).toEqual({ message: "I can help Saturday morning." });
  await page.getByRole("button", { name: "Withdraw offer" }).click();
  await expect(page.getByRole("button", { name: "Offer to help" })).toBeVisible();
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/needs/need-1/responses/me")).toBe(true);
});
