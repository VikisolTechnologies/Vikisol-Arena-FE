import { test, expect, type Page } from "@playwright/test";
import screens from "../../../src/lib/dev/screens.json";

/** Deep links into the middle of an intake never show a blank page; the compare specimens each
 *  show their own screen (architect review 3, items 2 and 3). */
const openAsPerson = async (page: Page, to: string, seed?: () => void) => {
  await page.goto(`/dev/person?to=${encodeURIComponent(to)}`);
  await page.waitForURL((u) => u.pathname === to.split("?")[0], { timeout: 30_000 });
  void seed;
};
const kindStep = (page: Page) => expect(page.getByRole("heading", { name: /What (are you|kind)/i }).first()).toBeVisible({ timeout: 15_000 });

test("?step=details or ?step=preview with no draft goes back to 'What kind?'", async ({ page }) => {
  for (const step of ["details", "cover", "preview"]) {
    await openAsPerson(page, `/activities/new?step=${step}`);
    await kindStep(page);
    await expect(page).toHaveURL(/\/activities\/new$/);
  }
});

test("with a kind chosen but no answers, cover and preview open the details", async ({ page }) => {
  await openAsPerson(page, "/home");
  await page.evaluate(() => localStorage.setItem("arena_activity_kind", "cricket"));
  await page.goto("/activities/new?step=preview");
  await expect(page.getByRole("heading", { name: "Sunday tennis-ball cricket" })).toHaveCount(0);
  await expect(page).toHaveURL(/step=details/);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.locator("form, [aria-label^='Step']").first()).toBeVisible();
});

test("every screen on the architect's list has its own route", () => {
  const own = ["activity-intake", "activity-preview", "activity-manage", "activity-checkin", "activity-cancel", "activity-leave", "approved-ready", "post-need", "career-status", "career-skills", "career-pay", "career-prefs", "career-proof", "career-review"];
  const routes = own.map((id) => (screens as { id: string; route: string }[]).find((s) => s.id === id)?.route);
  expect(routes.every(Boolean)).toBe(true);
  expect(new Set(routes).size).toBe(routes.length);
});

const SPECIMENS: [string, string | RegExp][] = [
  ["activity-intake", /the basics/],
  ["activity-preview", "This is how neighbours will see it."],
  ["activity-manage", "Requests to join"],
  ["activity-checkin", "Who showed up?"],
  ["activity-cancel", "Cancel"],
  ["activity-leave", /Leave|Can't make it/],
  ["approved-ready", "You're in!"],
];
for (const [id, text] of SPECIMENS) {
  test(`specimen ${id}`, async ({ page }) => {
    await page.goto(`/dev/screen/${id}`);
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
  });
}

test("manage shows the queue, check-in the attendance list, cancel and leave their sheets", async ({ page }) => {
  await page.goto("/dev/screen/activity-manage");
  await expect(page.getByText("Meera Iyer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel activity" })).toBeVisible();
  await page.goto("/dev/screen/activity-checkin");
  await expect(page.getByRole("dialog", { name: "Check in" }).getByText("Rohit Varma")).toBeVisible();
  await page.goto("/dev/screen/activity-cancel");
  await expect(page.getByRole("dialog").getByText(/Cancel/i).first()).toBeVisible();
  await page.goto("/dev/screen/activity-leave");
  await expect(page.getByRole("dialog")).toBeVisible();
});

const CAREER: [string, RegExp][] = [
  ["career-status", /Status/],
  ["career-skills", /Role family|Skills/],
  ["career-pay", /CTC|Expected/],
  ["career-prefs", /Preferences|Work mode|Preferred|Notice|locations/i],
  ["career-proof", /Proof|Portfolio|links|Resume/i],
];
for (const [id, text] of CAREER) {
  test(`specimen ${id} opens its own step`, async ({ page }) => {
    const route = (screens as { id: string; route: string }[]).find((s) => s.id === id)!.route;
    await page.goto(route);
    await page.waitForURL((u) => u.pathname === "/identity/career", { timeout: 30_000 });
    expect(page.url()).toContain(`start=${id.replace("career-", "")}`);
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel(/Step 1 of/)).toHaveCount(0);
  });
}

test("career-review opens the review", async ({ page }) => {
  const route = (screens as { id: string; route: string }[]).find((s) => s.id === "career-review")!.route;
  await page.goto(route);
  await page.waitForURL((u) => u.pathname === "/identity/career");
  await expect(page.getByLabel("Review")).toBeVisible({ timeout: 20_000 });
});

test("post-need opens the need's own details, not the kind picker", async ({ page }) => {
  const route = (screens as { id: string; route: string }[]).find((s) => s.id === "post-need")!.route;
  await page.goto(route);
  await page.waitForURL((u) => u.pathname === "/needs/new");
  await expect(page.getByText("What do you need?")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("What kind of help?")).toHaveCount(0);
});
