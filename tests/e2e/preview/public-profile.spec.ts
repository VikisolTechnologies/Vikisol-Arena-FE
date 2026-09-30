import { test, expect, type Page } from "@playwright/test";

/** /people/[id]: the B+ public profile, its visibility rules and the no-scores rule (mock mode). */
const signedIn = async (page: Page, to: string) => {
  await page.goto(`/dev/person?to=${encodeURIComponent(to)}`);
  await page.waitForURL((u) => u.pathname === to.split("?")[0], { timeout: 30_000 });
};
const signedOut = async (page: Page, path: string) => {
  await page.goto("/privacy");
  await page.evaluate(() => localStorage.setItem("arena_cookie_consent", "accepted"));
  await page.goto(path);
};
const unavailable = (page: Page) => page.getByText("This profile isn't available");

test("a visible profile shows the person, Follow / Message / Report, and never a score", async ({ page }) => {
  await signedIn(page, "/people/cand-2");
  await expect(page.getByRole("heading", { name: "Rohit Varma", level: 1 })).toBeVisible();
  await expect(page.getByText("Frontend Developer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Message" })).toHaveAttribute("href", /\/rooms\?with=cand-2/);
  await expect(page.getByRole("button", { name: "Report" })).toBeVisible();
  // The old pre-B+ page showed an "Arena Score" and its own bottom bar.
  await expect(page.getByText(/score/i)).toHaveCount(0);
  await expect(page.getByText("Discuss")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Feed" })).toBeVisible();
  await page.getByRole("button", { name: "Follow" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true");
});

test("Report opens the report sheet for this person", async ({ page }) => {
  await signedIn(page, "/people/cand-2");
  await page.getByRole("button", { name: "Report" }).click();
  const sheet = page.getByRole("dialog", { name: "Report a problem" });
  await expect(sheet.getByText("Rohit Varma")).toBeVisible();
  await expect(sheet.getByText(/Also block Rohit/)).toBeVisible();
});

test("a hidden profile is just 'not available' and leaks nothing", async ({ page }) => {
  await signedIn(page, "/people/cand-hidden");
  await expect(unavailable(page)).toBeVisible();
  await expect(page.getByText("Hidden neighbour")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Follow" })).toHaveCount(0);
});

test("an unknown profile reads the same as a hidden one", async ({ page }) => {
  await signedIn(page, "/people/nobody-here");
  await expect(unavailable(page)).toBeVisible();
});

test("a Nearby-only profile needs you to be signed in", async ({ page }) => {
  await signedOut(page, "/people/cand-7");
  await expect(unavailable(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Kavya Reddy")).toHaveCount(0);
  await signedIn(page, "/people/cand-7");
  await expect(page.getByRole("heading", { name: "Kavya Reddy", level: 1 })).toBeVisible();
});

test("a public profile shows to a signed-out visitor, without Report, and Follow asks them to sign in", async ({ page }) => {
  await signedOut(page, "/people/cand-2");
  await expect(page.getByRole("heading", { name: "Rohit Varma", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Follow" })).toHaveAttribute("href", /auth\?mode=signin/);
});

test("your own profile is the You tab", async ({ page }) => {
  await signedIn(page, "/home");
  await page.goto("/people/cand-1");
  await page.waitForURL(/\/identity/);
});
