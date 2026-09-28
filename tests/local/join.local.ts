import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

// B+ P3 — Discover & join (activity details, join request sent, approved & ready, activity room).
// Real API mode, every call intercepted; asserts the exact calls and what's revealed when.

const basePost = {
  id: "act-1",
  authorUserId: "host-1",
  authorName: "Ananya Sharma",
  authorEmoji: "a",
  intentType: "activity",
  title: "Sunrise Run at Durgam Lake",
  body: "A friendly 5K to kickstart the weekend.",
  locationText: "Gachibowli",
  capacity: 20,
  spotsFilled: 4,
  startsAt: new Date(Date.now() + 26 * 3600_000).toISOString(),
  mediaUrls: [],
  tags: ["running"],
  status: "open",
  visibility: "approval",
  createdAt: new Date().toISOString(),
  mine: false,
  demoContent: false,
};

async function setup(page: Page, post: Record<string, unknown>, calls: string[]) {
  let current = { ...post };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    calls.push(`${req.method()} ${path}`);
    let data: unknown = [];
    if (path === "/posts/act-1" && req.method() === "GET") data = current;
    else if (path === "/posts/act-1/joins" && req.method() === "POST") {
      current = { ...current, myJoinStatus: "pending" };
      data = { id: "j1", postId: "act-1", userId: "me", userName: "Priya", userEmoji: "p", status: "pending", createdAt: new Date().toISOString() };
    } else if (path === "/posts/act-1/joins/me" && req.method() === "DELETE") {
      current = { ...current, myJoinStatus: undefined };
      data = { id: "j1", postId: "act-1", userId: "me", userName: "Priya", userEmoji: "p", status: "withdrawn", createdAt: new Date().toISOString() };
    } else if (path === "/rooms") data = [{ id: "room-1", postId: "act-1", postBody: "Sunrise Run", postIntentType: "activity", memberCount: 2, unread: false, muted: false, postStatus: "open", lastMessageAt: new Date().toISOString() }];
    else if (path === "/rooms/room-1/messages" && req.method() === "GET") data = [{ id: "m1", roomId: "room-1", fromMe: false, senderName: "Ananya", content: "See you at the East Gate!", createdAt: new Date().toISOString() }];
    else if (path === "/rooms/room-1/messages") data = { id: "m2", roomId: "room-1", fromMe: true, content: "On my way", createdAt: new Date().toISOString() };
    else if (path === "/rooms/room-1/members") data = [{ userId: "host-1", name: "Ananya Sharma", emoji: "a", role: "admin" }, { userId: "me", name: "Priya Sharma", emoji: "p", role: "member" }];
    else if (path.startsWith("/profile/me")) data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Engineering", location: "", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: false }, autonomy: "manual" };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
}

test("request to join → sent sheet with status → cancel request", async ({ page }) => {
  const calls: string[] = [];
  await setup(page, basePost, calls);
  await page.goto("/feed/act-1");
  await expect(page.getByRole("heading", { name: "Sunrise Run at Durgam Lake" })).toBeVisible();
  await expect(page.getByText("16 spots available")).toBeVisible();
  await noSeriousA11y(page);
  // The exact point is never shown before approval.
  await expect(page.getByText(/exact point shared after you join/)).toBeVisible();
  await page.getByRole("button", { name: "Request to join" }).click();
  const sheet = page.getByRole("dialog", { name: "Join request sent" });
  await expect(sheet.getByRole("heading", { name: "Join request sent!" })).toBeVisible();
  await expect(sheet.getByText("Host will review")).toBeVisible();
  await noSeriousA11y(page);
  expect(calls).toContain("POST /posts/act-1/joins");
  await sheet.getByRole("button", { name: "Cancel request" }).click();
  await expect(sheet).toHaveCount(0);
  expect(calls).toContain("DELETE /posts/act-1/joins/me");
  await expect(page.getByRole("button", { name: "Request to join" })).toBeVisible();
});

test("approved: You're in! with the real meeting point, calendar file and the room", async ({ page }) => {
  const calls: string[] = [];
  await setup(page, { ...basePost, myJoinStatus: "approved", exactMeetingPoint: "Durgam Lake – East Gate", roomId: "room-1" }, calls);
  await page.goto("/feed/act-1");
  await expect(page.getByRole("heading", { name: "You're in!" })).toBeVisible();
  await expect(page.getByText("Durgam Lake – East Gate")).toBeVisible();
  await noSeriousA11y(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  await page.getByRole("link", { name: "Open activity room" }).click();
  await expect(page).toHaveURL(/\/rooms\/room-1/);
  await expect(page.getByText("See you at the East Gate!")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByLabel("Send a message").fill("On my way");
  await page.getByRole("button", { name: "Send" }).click();
  expect(calls).toContain("POST /rooms/room-1/messages");
  await page.getByRole("radio", { name: /People/ }).click();
  await expect(page.getByText("Host")).toBeVisible();
});
