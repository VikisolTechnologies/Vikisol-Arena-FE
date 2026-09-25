import { test, expect } from "@playwright/test";

test("approval requires a click even for an autopilot profile and survives reload", async ({ page }) => {
  let decisions = 0;
  let state = "pending";
  const action = () => ({ id: "action-1", toolName: "arena.joinActivity", args: { postId: "post-1" }, status: state,
    result: state === "done" ? { status: "pending" } : null, expiresAt: "2030-01-01T00:00:00Z" });
  await page.addInitScript(() => {
    localStorage.setItem("arena_session", JSON.stringify({ userId: "test-user", name: "Test", role: "talent" }));
    localStorage.setItem("arena_jwt_token", "local-test-token");
    localStorage.setItem("arena_onboarded", "true");
  });
  await page.route("http://127.0.0.1:3199/api/v1/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    let data: unknown = { content: [] };
    if (path === "/api/v1/profile/me" || path === "/api/v1/me/profile") data = { id: "test-user", name: "Test", skills: [], consent: {}, autonomy: "autopilot" };
    if (path === "/api/v1/agent/conversation") data = { id: "conversation-1" };
    if (path.endsWith("/messages")) data = [{ id: "reply-1", role: "agent", content: "Review this activity before joining.", actions: [action()], createdAt: "2026-09-26T00:00:00Z" }];
    if (path === "/api/v1/agent/actions/action-1") {
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({ approve: true });
      decisions++; state = "done"; data = action();
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/agent");
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
  // Longer than the removed autopilot effect's 1200ms timer.
  await page.waitForTimeout(1600);
  expect(decisions).toBe(0);
  const cookies = page.getByRole("button", { name: "Accept", exact: true });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Your request was sent. The host still needs to approve it.")).toBeVisible();
  expect(decisions).toBe(1);
  await page.reload();
  await expect(page.getByText("Your request was sent. The host still needs to approve it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  expect(decisions).toBe(1);
});

test("a failed feed shows retry rather than claiming the network is empty", async ({ page }) => {
  await page.route("http://127.0.0.1:3199/api/v1/**", async (route) => {
    await route.fulfill({ status: 503, json: { success: false, message: "Temporarily unavailable" } });
  });
  await page.goto("/home");
  await expect(page.getByText("Some of your feed couldn't load. Available items are shown below.")).toBeVisible();
  await expect(page.getByText("Nothing here yet", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask Jenny to help you find, plan or post" })).toHaveAttribute("href", "/agent");
});
