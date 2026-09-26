import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const profile = {
  id: "person-1",
  name: "Priya",
  avatarEmoji: "a",
  title: "",
  industry: "Engineering",
  location: "",
  remote: false,
  skills: [],
  experienceYears: 0,
  rateFloor: 0,
  openTo: [],
  careerHealth: 0,
  consent: { autoApply: false, searchableByEnterprises: false },
  autonomy: "manual",
};

async function stubApi(page: import("@playwright/test").Page, calls: string[]) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    calls.push(`${route.request().method()} ${path}`);
    let data: unknown = null;
    if (path.endsWith("/auth/signup") || path.endsWith("/auth/signin")) {
      data = { role: "talent", candidateId: "person-1", name: "Priya", email: "priya@example.com", token: "local-token", mfaRequired: false, mfaPendingToken: null };
    } else if (path.includes("/profile/me")) {
      data = profile;
    } else if (path.endsWith("/feed")) {
      data = [];
    } else if (path.includes("/rooms")) {
      data = [];
    }
    await route.fulfill({ json: { success: true, data } });
  });
}

async function dismissCookies(page: import("@playwright/test").Page) {
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function shot(page: import("@playwright/test").Page, name: string, capture: boolean) {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(280);
    if (capture) await page.screenshot({ path: `docs/reviews/m1a-visual-correction/${name}-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
}

test("entry journey does not invent a profession or offer internal roles", async ({ page }, testInfo) => {
  const calls: string[] = [];
  await stubApi(page, calls);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/auth");
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Local people. Real outcomes." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recruiter" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hiring manager" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Platform admin" })).toHaveCount(0);
  const capture = testInfo.project.name === "desktop";
  await shot(page, "welcome", capture);

  await page.getByRole("button", { name: "Join Arena" }).click();
  await expect(page.getByRole("button", { name: "Join as a person" })).toBeVisible();
  await shot(page, "signup", capture);
  await page.getByLabel("Full name").fill("Priya");
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 6 characters.")).toBeVisible();
  await page.getByLabel("Password").fill("long-enough");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Arena" })).toBeVisible();

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Join activities" }).click();
  await shot(page, "intent", capture);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue without location" }).click();
  await shot(page, "location", capture);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Interests" })).toBeVisible();
  await shot(page, "interests", capture);
  await page.getByRole("button", { name: "Skip" }).click();
  await shot(page, "identity", capture);
  await expect(page.getByLabel("Professional title")).toHaveValue("");
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("No location.")).toBeVisible();
  await expect(page.getByText("Career information stays private.")).toBeVisible();
  await shot(page, "privacy", capture);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await shot(page, "ready", capture);
  await page.getByRole("button", { name: "Enter Arena" }).click();
  await expect(page.getByText("Nothing here yet")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Frontend Engineer")).toHaveCount(0);
  await expect(page.getByText("Bengaluru")).toHaveCount(0);
  await expect(page.getByText("Gachibowli")).toHaveCount(0);
  await shot(page, "feed", capture);
  expect(calls.some((call) => call.startsWith("PUT") && call.includes("/location"))).toBe(true);
  expect(calls.some((call) => call.includes("/profile/me/details"))).toBe(false);
});

test("sign in, forgot password, expired reset, and resume", async ({ page }, testInfo) => {
  const calls: string[] = [];
  await stubApi(page, calls);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/auth?mode=signin");
  await dismissCookies(page);
  if (testInfo.project.name === "desktop") {
    await page.screenshot({ path: "docs/reviews/m1a-visual-correction/signin-320.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "docs/reviews/m1a-visual-correction/signin-390.png" });
  } else {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.setViewportSize({ width: 320, height: 700 });
  const show = page.getByRole("button", { name: "Show" });
  await expect(show).toBeVisible();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await show.click();
    if ((await page.getByLabel("Password").getAttribute("type")) === "text") break;
    await page.waitForTimeout(250);
  }
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).click();
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.getByLabel("Password").fill("long-enough");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.goto("/auth/forgot");
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/auth/reset/expired-token");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();

  await page.goto("/auth?reason=expired");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Your session expired")).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya", email: "priya@example.com" }));
    localStorage.setItem("arena_entry_pending", "1");
    localStorage.setItem("arena_entry_draft", JSON.stringify({ step: 1, intents: ["meet"], locationChoice: null, area: "", interests: [], offerSkills: [], careerSkills: [], displayName: "", intro: "", availability: "", professionalTitle: "", careerPublic: false }));
  });
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "What brings you here?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Meet nearby people" })).toHaveAttribute("aria-pressed", "true");
});

test("welcome and signup have no serious accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  for (const width of [320, 360, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const welcome = await new AxeBuilder({ page }).analyze();
  expect(welcome.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([]);
  await page.getByRole("button", { name: "Join Arena" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.waitForTimeout(300);
  const signup = await new AxeBuilder({ page }).analyze();
  expect(signup.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth");
  const join = page.getByRole("button", { name: "Join Arena" });
  await expect(join).toBeVisible();
  const duration = await join.evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration === "0s" || duration === "0ms").toBe(true);
});
