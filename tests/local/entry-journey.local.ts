import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P1 — Entry & progressive onboarding (docs/design/BPLUS-SCREENS.md). Real API mode with every
// call intercepted: proves the screens send the existing request shapes and never invent data.

const profile = {
  id: "person-1",
  name: "Priya Sharma",
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

type Call = { method: string; path: string; body: unknown };

async function stubApi(page: Page, calls: Call[]) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = null;
    }
    calls.push({ method: req.method(), path, body });
    let data: unknown = null;
    if (path.endsWith("/auth/signup") || path.endsWith("/auth/signin")) {
      data = { role: "talent", candidateId: "person-1", name: "Priya Sharma", email: "priya@example.com", token: "local-token", mfaRequired: false, mfaPendingToken: null };
    } else if (path.includes("/profile/me")) {
      data = profile;
    } else if (path.endsWith("/feed") || path.includes("/rooms")) {
      data = [];
    }
    await route.fulfill({ json: { success: true, data } });
  });
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function noSeriousA11y(page: Page) {
  // Scan the settled screen, not a frame mid-entrance (fades would read as low contrast).
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), undefined, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
}

test("sign up → why → local life → identity → all set → feed, without inventing anything", async ({ page }) => {
  const calls: Call[] = [];
  await stubApi(page, calls);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/auth");
  await dismissCookies(page);

  await expect(page.getByRole("heading", { name: "Local people. Real outcomes." })).toBeVisible();
  for (const internal of ["Recruiter", "Hiring manager", "Platform admin"]) {
    await expect(page.getByRole("button", { name: internal })).toHaveCount(0);
  }
  await noOverflow(page);

  await page.getByRole("button", { name: "Join Arena" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  // Validation: errors after a submit, focus on the first problem, nothing sent.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await page.getByLabel("Full name").fill("Priya Sharma");
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByLabel("Full name").click();
  await expect(page.getByText("Use at least 6 characters.")).toBeVisible();
  await page.getByLabel("Password").fill("long-enough");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please agree to the Terms of Service and Privacy Policy.")).toBeVisible();
  expect(calls.some((c) => c.path.endsWith("/auth/signup"))).toBe(false);
  // Tap the visible box, as a person would (the real input is visually hidden).
  await page.locator('label[for="signup-agree"] > span').first().click();
  await expect(page.getByLabel(/I agree to the/)).toBeChecked();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding\?step=1/);
  expect(calls.find((c) => c.path.endsWith("/auth/signup"))?.body).toMatchObject({ name: "Priya Sharma", email: "priya@example.com", role: "talent" });
  await expect(page.getByRole("heading", { name: "Why are you here?" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeAttached();
  const find = page.getByRole("button", { name: /Find activities/ });
  await find.click();
  await expect(find).toHaveAttribute("aria-pressed", "true");
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Set up your local life" })).toBeVisible();
  // Nothing is pre-selected: Arena doesn't guess where someone lives.
  await expect(page.getByLabel("Your area")).toHaveValue("");
  await page.getByLabel("Your area").selectOption("Kondapur");
  await page.getByRole("button", { name: "Running" }).click();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Your identity" })).toBeVisible();
  await expect(page.getByLabel("Display name *")).toHaveValue("Priya Sharma");
  await expect(page.getByLabel("Professional title (optional)")).toHaveValue("");
  await page.getByLabel("Short intro (optional)").fill("Runner and weekend volunteer.");
  await expect(page.getByText(/stay on this device/)).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "You're all set!" })).toBeVisible();
  await expect(page.getByText("Joined for activities")).toBeVisible();
  await expect(page.getByText("Kondapur")).toBeVisible();
  await noSeriousA11y(page);
  const location = calls.find((c) => c.method === "PUT" && c.path.endsWith("/profile/me/location"));
  expect(location?.body).toEqual({ consent: "city", city: "Kondapur" });
  // No invented title/industry: the details endpoint is never called by onboarding.
  expect(calls.some((c) => c.path.endsWith("/profile/me/details"))).toBe(false);

  await page.getByRole("link", { name: "Go to Arena" }).click();
  await expect(page).toHaveURL(/\/home/);
});

test("Explore first goes straight to the feed; Skip always works", async ({ page }) => {
  const calls: Call[] = [];
  await stubApi(page, calls);
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
  });
  await page.goto("/onboarding?step=1");
  await dismissCookies(page);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Set up your local life" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Why are you here?" })).toBeVisible();
  await page.getByRole("button", { name: /Find activities/ }).click();
  await page.getByRole("button", { name: /Explore first/ }).click();
  // Exclusive: choosing Explore first clears the others.
  await expect(page.getByRole("button", { name: /Find activities/ })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Go to Arena" }).click();
  await expect(page).toHaveURL(/\/home/);
  // "You're all set" is never reachable by URL without a real save.
  await page.goto("/onboarding?step=4");
  await expect(page.getByRole("heading", { name: "Your identity" })).toBeVisible();
});

test("sign in, forgot password, expired reset and session notice", async ({ page }) => {
  const calls: Call[] = [];
  await stubApi(page, calls);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/auth?mode=signin");
  await dismissCookies(page);
  await noOverflow(page);
  await page.getByLabel("Password").fill("long-enough");
  await page.getByRole("button", { name: "Show the characters" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide the characters" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home/);

  await page.goto("/auth/forgot");
  await page.getByLabel("Email address").fill("priya@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  expect(calls.some((c) => c.path.includes("/auth/forgot"))).toBe(true);

  await page.goto("/auth/reset/expired-token");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();

  await page.evaluate(() => localStorage.removeItem("arena_session"));
  await page.goto("/auth?mode=signin&reason=expired");
  await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
});

test("every entry screen fits 320–430px and respects reduced motion", async ({ page }) => {
  await page.goto("/auth");
  await dismissCookies(page);
  for (const url of ["/auth", "/auth?mode=signup", "/auth?mode=signin", "/auth/forgot"]) {
    await page.goto(url);
    for (const width of [320, 360, 375, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
    }
    await noSeriousA11y(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth");
  const join = page.getByRole("button", { name: "Join Arena" });
  await expect(join).toBeVisible();
  const duration = await join.evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration === "0s" || duration === "0ms").toBe(true);
});
