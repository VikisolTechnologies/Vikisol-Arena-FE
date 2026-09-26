import { expect, test, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createActivity, eraseAccount, removePost, setDateOfBirth, signIn, signUp, type Session } from "./liveApi";

/**
 * Twelve-step mobile path on the VNext preview, against the live API.
 * Both accounts are created for this run and erased after it. Posts are deleted,
 * or cancelled when a room message makes a hard delete impossible. Cancelled
 * posts leave the live feed.
 */
test.describe("two-account mobile golden path", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(180_000);

  test("need, response, room, outcome, and profile", async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Runs once, on the 390×844 phone.");
    const stamp = Date.now();
    const password = `B2-${stamp}-Path`;
    const needBody = `TEST B2 need ${stamp}`;
    const activityBody = `TEST B2 activity ${stamp}`;
    const message = `TEST B2 reply ${stamp}`;
    const cleanup: string[] = [];
    let host: Session | null = null;
    let guest: Session | null = null;
    let needId = "";
    let activityId = "";

    try {
      await page.goto("/");
      await acceptCookies(page);
      await expect(page.getByRole("heading", { name: /A network for needs, people/ })).toBeVisible();

      await page.goto("/auth?mode=signup");
      await acceptCookies(page);
      await page.locator("#name").click();
      await page.locator("#name").pressSequentially("B2 Test Host");
      await page.locator("#email").click();
      await page.locator("#email").pressSequentially(`b2.host.${stamp}@vikisol.dev`);
      await page.locator("#password").click();
      await page.locator("#password").pressSequentially(password);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
      host = await sessionFrom(page);
      await page.goto("/onboarding");
      await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeVisible();
      await page.getByPlaceholder("Aditi Sharma").fill("B2 Test Host");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: /Just here to explore/ }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByPlaceholder("e.g. Product Designer").fill("Test helper");
      await page.getByRole("button", { name: "Engineering" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Enter Arena" }).click();
      await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });

      await expect(page.getByText("B2 Test Host").first()).toBeVisible();
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByRole("button", { name: "I need something" }).click();
      await page.getByPlaceholder("What should happen?").fill(needBody);
      await page.getByRole("button", { name: "Publish" }).click();
      await expect(page).toHaveURL(/\/feed\/[0-9a-f-]+$/, { timeout: 20_000 });
      needId = page.url().split("/").pop() || "";
      expect(needId).not.toBe("");

      guest = await signUp("B2 Test Guest", `b2.guest.${stamp}@vikisol.dev`, password);
      await setDateOfBirth(host.token);
      await setDateOfBirth(guest.token);

      const guestPage = await openAs(browser, guest);
      await guestPage.goto(`/feed/${needId}`);
      await guestPage.getByRole("button", { name: "Join", exact: true }).click();
      await expect(guestPage.getByRole("button", { name: "Open room" })).toBeVisible({ timeout: 15_000 });
      await guestPage.getByRole("button", { name: "Open room" }).click();
      await expect(guestPage).toHaveURL(/\/rooms\//);
      await guestPage.getByPlaceholder("Message...").fill(message);
      await guestPage.getByRole("button", { name: "Send" }).click();
      await expect(guestPage.getByText(message)).toBeVisible();

      await page.goto("/work");
      await page.getByRole("button", { name: new RegExp(needBody) }).click();
      await page.getByRole("button", { name: "Mark resolved" }).click();
      await expect(page.getByText(needBody).first()).toBeVisible({ timeout: 15_000 });

      const startsAt = new Date(Date.now() + 20_000).toISOString();
      const activity = await createActivity(host.token, activityBody, startsAt);
      activityId = activity.id;
      await guestPage.goto(`/feed/${activityId}`);
      await guestPage.getByRole("button", { name: "Join", exact: true }).click();
      await expect(guestPage.getByRole("button", { name: "Open room" })).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(Math.max(0, new Date(startsAt).getTime() - Date.now() + 1_500));

      await page.goto("/work");
      await page.getByRole("button", { name: /Mark attendance/ }).click();
      await page.getByRole("button", { name: "Attended" }).click();
      await expect(page.getByText("attended").first()).toBeVisible({ timeout: 15_000 });

      await page.goto("/identity");
      await expect(page.getByRole("heading", { name: "B2 Test Host" })).toBeVisible({ timeout: 15_000 });
      expect(await outcomeCount(page, "Needs resolved")).toBeGreaterThanOrEqual(1);
      expect(await outcomeCount(page, "Activities hosted")).toBeGreaterThanOrEqual(1);
      await guestPage.goto("/identity");
      expect(await outcomeCount(guestPage, "Activities joined")).toBeGreaterThanOrEqual(1);

      await guestPage.goto("/notifications");
      await expect(guestPage.getByText("Join request approved").first()).toBeVisible({ timeout: 15_000 });

      await page.goto("/settings");
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator(".fixed").getByRole("button", { name: "Log out" }).click();
      await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
      await page.goto(`/feed/${needId}`);
      await expect(page.getByText(needBody).first()).toBeVisible({ timeout: 15_000 });
      await guestPage.close();
    } finally {
      let hostToken = host?.token ?? "";
      if (host) {
        try {
          hostToken = (await signIn(host.email, password)).token;
        } catch {
          hostToken = host.token;
        }
      }
      if (hostToken && needId) cleanup.push(`need ${needId} ${await safe(() => removePost(hostToken, needId))}`);
      if (hostToken && activityId) cleanup.push(`activity ${activityId} ${await safe(() => removePost(hostToken, activityId))}`);
      if (hostToken && host) cleanup.push(`host ${host.email} ${await safe(() => eraseAccount(hostToken))}`);
      if (guest) cleanup.push(`guest ${guest.email} ${await safe(() => eraseAccount(guest.token))}`);
      const file = path.join("test-results", "b4-golden-cleanup.json");
      fs.mkdirSync("test-results", { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ stamp, cleanup }, null, 2));
    }
  });
});

async function acceptCookies(page: Page) {
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function sessionFrom(page: Page): Promise<Session> {
  const raw = await page.evaluate(() => ({
    token: localStorage.getItem("arena_jwt_token"),
    session: localStorage.getItem("arena_session"),
  }));
  if (!raw.token || !raw.session) throw new Error("Signup did not store a session");
  const session = JSON.parse(raw.session) as { name: string; email: string; role: string };
  return { token: raw.token, name: session.name, email: session.email, role: session.role };
}

async function openAs(browser: Browser, session: Session) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/home");
  await page.evaluate((value) => {
    localStorage.setItem("arena_jwt_token", value.token);
    localStorage.setItem("arena_session", JSON.stringify({
      role: value.role.toLowerCase(),
      name: value.name,
      email: value.email,
    }));
    localStorage.setItem("arena_onboarded", "true");
  }, session);
  await page.reload();
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible().catch(() => false)) await accept.click();
  return page;
}

async function outcomeCount(page: Page, label: string) {
  const term = page.locator("dt", { hasText: label }).first();
  return Number(await term.locator("xpath=following-sibling::dd[1]").innerText());
}

async function safe(run: () => Promise<unknown>) {
  try {
    const value = await run();
    return typeof value === "string" ? value : "erased";
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : "unknown"}`;
  }
}
