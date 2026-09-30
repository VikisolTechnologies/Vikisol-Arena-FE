import { test, expect, type Page } from "@playwright/test";

/** Preview activities with a matching fixture photo show it (the procedural cover is only the fallback). */
async function openAsPerson(page: Page, path: string) {
  await page.goto(`/dev/person?to=${encodeURIComponent(path)}`);
  await page.waitForURL((u) => u.pathname + u.search === path || u.pathname === path.split("?")[0], { timeout: 30_000 });
}
const loaded = (page: Page, src: RegExp) =>
  page.waitForFunction(
    (re) => [...document.images].some((i) => new RegExp(re).test(decodeURIComponent(i.currentSrc || i.src)) && i.complete && i.naturalWidth > 0),
    src.source,
    { timeout: 20_000 },
  );

test("Feed: the badminton activities show the badminton photo", async ({ page }) => {
  await openAsPerson(page, "/home");
  await expect(page.getByRole("heading", { name: "Badminton doubles tonight" })).toBeVisible();
  await loaded(page, /fixtures\/photos\/badminton\.webp/);
  await page.getByRole("radio", { name: "All" }).click();
  await expect(page.getByText("Beginner-friendly badminton").first()).toBeVisible();
  const card = page.locator('a[href="/feed/post-badminton-beginners"]').filter({ has: page.locator("img") }).first();
  await expect(card.locator("img").first()).toHaveAttribute("src", /badminton/);
});

test("Discover: the beginner badminton result uses the badminton photo", async ({ page }) => {
  await openAsPerson(page, "/discover?q=I%20want%20a%20beginner%20badminton%20game%20this%20weekend");
  const result = page.locator("a", { hasText: "Beginner-friendly badminton" }).first();
  await expect(result).toBeVisible();
  await expect(result.locator("img").first()).toHaveAttribute("src", /badminton/);
});

test("Smart match: the hero photo and the organiser's face both load", async ({ page }) => {
  await openAsPerson(page, "/agent/match/post-cleanup");
  await expect(page.getByRole("heading", { name: "Smart match" })).toBeVisible();
  await loaded(page, /fixtures\/photos\/cleanup\.webp/);
  await loaded(page, /fixtures\/people\/arjun\.webp/);
  // Also for a post whose organiser has no photo fixture: the initials show, never an empty disc.
  await openAsPerson(page, "/agent/match/post-badminton-beginners");
  await loaded(page, /fixtures\/photos\/badminton\.webp/);
  const org = page.getByLabel("Additional context").locator("img, span[aria-hidden]").first();
  await expect(org).toBeVisible();
  expect(((await org.textContent()) ?? "") + (await org.evaluate((e) => (e as HTMLImageElement).naturalWidth ?? 0))).not.toBe("0");
});
