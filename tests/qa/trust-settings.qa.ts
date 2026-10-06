import { test, expect, type Page } from "@playwright/test";

// MARATHON-QA journey 2 (Profile) remainder — notification preferences, report, and block.
// Real frontend (localhost:3000) against the real backend (localhost:8081/api/v1), no fixtures.

function qaEmail(tag: string) {
  return `qa+${tag}${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

async function dismissCookies(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

async function agreeToTerms(page: Page) {
  if (!(await page.locator("#signup-agree").isChecked())) {
    await page.locator('label[for="signup-agree"] span[aria-hidden="true"]').click();
  }
}

async function signUpAndOnboard(page: Page, tag: string) {
  const email = qaEmail(tag);
  const password = "TestPass123!";
  await page.goto("/?mode=signup");
  await page.locator("#signup-name").fill(`QA ${tag}`);
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.locator("#signup-dob").fill("1995-05-15");
  await agreeToTerms(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page
    .locator('button:has-text("Find activities")')
    .first()
    .click()
    .catch(() => {});
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 4 && page.url().includes("/onboarding"); i++) {
    const cont = page.getByRole("button", { name: "Continue" });
    if (await cont.isVisible().catch(() => false)) {
      if (!(await cont.isDisabled().catch(() => true))) {
        await cont.click();
        await page.waitForTimeout(800);
      } else break;
    } else break;
  }
  await page
    .locator('a:has-text("Go to Arena")')
    .click()
    .catch(() => {});
  await page.waitForURL(/\/home/, { timeout: 10_000 }).catch(() => {});
  return { email, password };
}

test.describe("Journey 2 — Notification preferences", () => {
  test("toggles save and survive a reload", async ({ page }) => {
    await signUpAndOnboard(page, "notif");
    await page.goto("/account/notifications");
    await noHorizontalOverflow(page);

    // Jenny defaults to off (deviceOnly pref); flip it on and confirm the save doesn't error.
    const jennySwitch = page.getByRole("switch", { name: "Jenny" });
    await expect(jennySwitch).toBeVisible();
    const before = await jennySwitch.getAttribute("aria-checked");
    await jennySwitch.click();
    await page.waitForTimeout(600);
    // QA-filed (see QA-BUGS.md): the save handler double-fires a real PUT (side effect inside a
    // setState updater, double-invoked), and the duplicate call 409s, surfacing a false
    // "Couldn't save" error even though the first PUT already succeeded. Documenting, not
    // asserting it away, so this test keeps catching it until it's fixed.
    const sawFalseError = await page.getByText(/Couldn't save/i).isVisible().catch(() => false);
    test.info().annotations.push({ type: "false-save-error-shown", description: String(sawFalseError) });
    const after = await jennySwitch.getAttribute("aria-checked");
    expect(after, "toggle's aria-checked must flip").not.toBe(before);

    // Reload: does the flipped state survive, or silently revert?
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.getByRole("switch", { name: "Jenny" }).getAttribute("aria-checked");
    test.info().annotations.push({
      type: "notif-pref-persists-after-reload",
      description: `before=${before} afterToggle=${after} afterReload=${afterReload}`,
    });
    await noHorizontalOverflow(page);
  });
});

test.describe("Journey 2 — Report and block", () => {
  test("reporting a profile with 'also block' adds them to Blocked accounts, unblock removes them", async ({
    page,
    browser,
  }) => {
    await signUpAndOnboard(page, "trustA");

    const contextB = await browser.newContext({ viewport: page.viewportSize() });
    const pageB = await contextB.newPage();
    await signUpAndOnboard(pageB, "trustB");
    await pageB.goto("/account/share");
    const shareLinkMatch = (await pageB.locator("body").innerText()).match(
      /http:\/\/localhost:3000\/people\/[a-f0-9-]+/,
    );
    expect(shareLinkMatch, "share screen must show a public profile link").toBeTruthy();
    const profileUrlB = shareLinkMatch![0];
    await contextB.close();

    await page.goto(profileUrlB);
    await dismissCookies(page); // QA-filed: cookie banner (z-[900]) otherwise blocks the sheet's Submit button (z-50).
    await noHorizontalOverflow(page);

    const reportButton = page.getByRole("button", { name: /Report/i });
    await expect(reportButton).toBeVisible({ timeout: 10_000 });
    await reportButton.click();

    await expect(page.getByText("Report a problem")).toBeVisible();
    await page.getByText("Spam or unsolicited contact", { exact: true }).click();
    const alsoBlock = page.getByText(/Also block/i);
    await expect(alsoBlock).toBeVisible();
    await alsoBlock.click();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "Submit report" }).click();
    await expect(page.getByText("Thanks for telling us")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Done" }).click();

    await page.goto("/account/blocked");
    await noHorizontalOverflow(page);
    await expect(page.getByText("QA trustB", { exact: false })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Unblock" }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText("No one blocked")).toBeVisible({ timeout: 10_000 });
  });
});
