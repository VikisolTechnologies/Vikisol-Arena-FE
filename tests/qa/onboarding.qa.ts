import { test, expect, type Page } from "@playwright/test";

// MARATHON-QA journey 1 (Onboarding) — real frontend (localhost:3000) against the real backend
// (localhost:8081/api/v1), no fixtures, no stubbed routes. Creates real accounts through the
// real sign-up screen, as docs/missions/MARATHON-QA.md requires.

function qaEmail(tag: string) {
  return `qa+${tag}${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;
}

async function dismissCookies(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

async function agreeToTerms(page: Page) {
  if (!(await page.locator("#signup-agree").isChecked())) {
    await page.locator('label[for="signup-agree"] span[aria-hidden="true"]').click();
  }
}

test.describe("Journey 1 — Onboarding", () => {
  test("under-18 sign-up is refused, adult sign-up completes onboarding, session survives refresh and sign-out/in", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    // --- Under-18 refusal ---
    await page.goto("/?mode=signup");
    await dismissCookies(page);
    await noHorizontalOverflow(page);

    const minorEmail = qaEmail("minor");
    await page.locator("#signup-name").fill("QA Minor");
    await page.locator("#signup-email").fill(minorEmail);
    await page.locator("#signup-password").fill("TestPass123!");
    await page.locator("#signup-dob").fill("2015-01-01");
    await agreeToTerms(page);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/18 or older/i)).toBeVisible({ timeout: 10_000 });
    // must still be on the sign-up screen, not past the age gate
    expect(page.url()).toContain("mode=signup");

    // --- Adult sign-up ---
    const email = qaEmail("person");
    const password = "TestPass123!";
    await page.locator("#signup-name").fill("QA Person");
    await page.locator("#signup-email").fill(email);
    await page.locator("#signup-password").fill(password);
    await page.locator("#signup-dob").fill("1995-05-15");
    await agreeToTerms(page);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await noHorizontalOverflow(page);

    // Walk the onboarding steps generically: pick a card on step 1, Continue through the rest.
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
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 10_000 });
    await noHorizontalOverflow(page);
    await page.locator('a:has-text("Go to Arena")').click();
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // --- Empty feed state has a clear next action ---
    await expect(page.getByText(/Nothing within 5 km yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an activity" })).toBeVisible();
    await noHorizontalOverflow(page);

    // --- Refresh keeps the session ---
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText(/Nothing within 5 km yet/i)).toBeVisible();

    // --- Sign out, then sign back in ---
    await page.locator('a[href="/identity"]').click();
    await page.getByText("Sign out", { exact: false }).first().click();
    await expect(page).toHaveURL(/mode=signin/, { timeout: 10_000 });

    // wrong password shows a clear error, doesn't crash
    await page.locator("#signin-email").fill(email);
    await page.locator("#signin-password").fill("WrongPassword1!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 });

    // correct password signs back in
    await page.locator("#signin-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

    // Only the under-18 signup (expected validation) should have produced any error-level noise.
    const unexpected = consoleErrors.filter((e) => !e.includes("400") && !e.includes("401"));
    expect(unexpected, `unexpected console errors: ${JSON.stringify(unexpected)}`).toEqual([]);
  });
});
