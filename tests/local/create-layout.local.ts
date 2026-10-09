import { test, expect, type Page } from "@playwright/test";

// The Continue action sits in the page flow, under the questions, and stays clear of the
// bottom tab bar. Checked at the two phone sizes the founder used.

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
] as const;

async function signedIn(page: Page) {
  await page.route("**/api/v1/**", (route) => route.fulfill({ json: { success: true, data: null } }));
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
    sessionStorage.setItem("arena_location_session", "1");
  });
}

async function actionClearsContent(page: Page, label: string) {
  const button = page.getByRole("button", { name: label }).last();
  await expect(button).toBeVisible();
  await page.evaluate((name) => {
    const buttons = [...document.querySelectorAll("button")].filter((b) => (b.textContent ?? "").trim() === name);
    const btn = buttons[buttons.length - 1];
    if (!btn) return;
    let node: HTMLElement | null = btn.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
        node.scrollTop = node.scrollHeight;
        return;
      }
      node = node.parentElement;
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, label);
  const result = await page.evaluate((name) => {
    const buttons = [...document.querySelectorAll("button")].filter((b) => (b.textContent ?? "").trim() === name);
    const btn = buttons[buttons.length - 1] as HTMLElement | undefined;
    if (!btn) return { missing: true as const };
    const br = btn.getBoundingClientRect();
    const fields = [...document.querySelectorAll("input, textarea, select, [role=radio], [role=checkbox], [role=switch], h1")];
    const overlaps = fields
      .filter((f) => {
        if (btn.contains(f)) return false;
        const r = f.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        return r.bottom > br.top + 1 && r.top < br.bottom - 1 && r.right > br.left + 1 && r.left < br.right - 1;
      })
      .map((f) => (f.getAttribute("aria-label") || f.textContent || f.tagName).replace(/\s+/g, " ").trim().slice(0, 48));
    const tab = document.querySelector("nav[aria-label='Primary'] a[href='/home']");
    const tabTop = tab ? tab.getBoundingClientRect().top : null;
    return { missing: false as const, overlaps, buttonBottom: br.bottom, tabTop };
  }, label);
  expect(result.missing).toBe(false);
  expect(result.overlaps).toEqual([]);
  if (result.tabTop != null) expect(result.buttonBottom).toBeLessThanOrEqual(result.tabTop + 1);
}

for (const viewport of VIEWPORTS) {
  test(`create flows keep Continue under the questions at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ ...viewport });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signedIn(page);

    await page.evaluate(() => localStorage.setItem("arena_activity_kind", "cricket"));
    await page.goto("/activities/new?step=details");
    await expect(page.getByRole("heading", { name: "Cricket: the basics" })).toBeVisible();
    await actionClearsContent(page, "Continue");

    await page.goto("/needs/new?kind=moving");
    await expect(page.getByRole("heading", { name: "What do you need?" })).toBeVisible();
    await actionClearsContent(page, "Continue");

    await page.goto("/offers/new?kind=errands");
    await expect(page.getByRole("heading", { name: "What can you offer?" })).toBeVisible();
    await actionClearsContent(page, "Continue");

    await page.goto("/projects/new");
    await expect(page.getByRole("heading", { name: "Start a project" })).toBeVisible();
    await actionClearsContent(page, "Continue");

    await page.evaluate(() => localStorage.setItem("arena_onboarded", "false"));
    for (const step of [1, 2, 3, 4]) {
      await page.goto(`/onboarding?step=${step}`);
      await expect(page.getByRole("button", { name: "Continue" }).last()).toBeVisible();
      await actionClearsContent(page, "Continue");
    }
  });
}
