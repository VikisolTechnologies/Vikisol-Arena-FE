import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 1: Company A onboards, verifies (admin approves), posts a job with a pay range, opens it.

const COMPANY_EMAIL = "priya@brightpeak.example";
const COMPANY_PASS = "LocalDemo123!";
const ADMIN_EMAIL = "platformadmin-m2@vikisol.dev";
const ADMIN_PASS = "AdminPass123!";

async function totp(): Promise<string> {
  const { execSync } = await import("child_process");
  return execSync(
    `python3 -c "import pyotp; print(pyotp.TOTP('G4C3E65TBJ2D37RJZ5XXAOGH6KRKLYJY').now())"`
  ).toString().trim();
}

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
}

async function switchAccount(page: import("@playwright/test").Page) {
  // Clear the previous account's localStorage token and cookies before signing in as someone
  // else, so a stale access token doesn't race the new sign-in.
  await page.context().clearCookies();
  await page.goto("/auth?mode=signin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await dismissCookieBanner(page);
}

test("company onboarding -> verification -> admin approve -> post job -> open", async ({ page }) => {
  await page.goto("/auth?mode=signin");
  await dismissCookieBanner(page);
  await page.getByLabel("Email address").fill(COMPANY_EMAIL);
  await page.getByLabel("Password").fill(COMPANY_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await page.waitForURL(/enterprise\/onboarding|enterprise\/dashboard/, { timeout: 20_000 });
  if (page.url().includes("onboarding")) {
    // Step 1: company workspace.
    await page.getByLabel("Legal company name").fill("BrightPeak Robotics Pvt Ltd");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: about the company (industry select, size chips both required).
    await expect(page.getByText("About the company")).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Industry").selectOption({ index: 1 });
    await page.getByRole("radio", { name: "11-50" }).check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: what are you hiring for (list field, at least one item required).
    await expect(page.getByText("What are you hiring for?")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/Community Program Assistant/i).fill("Robotics Engineer");
    await page.getByRole("button", { name: /Add — Roles/i }).click();
    await page.getByRole("button", { name: "Review" }).click();
    await page.getByRole("button", { name: "Complete setup" }).click();
    await page.waitForURL(/enterprise\/dashboard/, { timeout: 20_000 });
  }

  // Verification
  await page.goto("/enterprise/admin/company");
  await expect(page.getByRole("heading", { name: "Company verification" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500); // let the async getMyVerification() fetch resolve and render.
  const legalName = page.getByLabel("Legal name");
  const alreadyPending = await page.getByText("Pending review").isVisible().catch(() => false);
  const alreadyVerified = await page.getByText("Verified", { exact: true }).isVisible().catch(() => false);
  if (!alreadyPending && !alreadyVerified && (await legalName.isVisible().catch(() => false))) {
    await legalName.fill("BrightPeak Robotics Pvt Ltd");
    await page.getByLabel("Website").fill("https://brightpeak.example");
    await page.getByLabel("Work email").fill(COMPANY_EMAIL);
    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(page.getByText(/We sent a code/)).toBeVisible({ timeout: 15_000 });

    // Fetch the real code from the backend log.
    const { execSync } = await import("child_process");
    const log = execSync("tail -n 400 /tmp/arena-be7.log || true").toString();
    const idx = log.lastIndexOf("Your Arena company verification code");
    expect(idx, "expected a company verification code email in the backend log").toBeGreaterThan(-1);
    const after = log.slice(idx);
    const match = after.match(/font-weight:700;letter-spacing:6px;">([0-9]{6})</);
    expect(match, "expected a 6-digit code after the email subject line").toBeTruthy();
    const code = match![1];

    await page.getByLabel("Code").fill(code);
    await page.getByRole("button", { name: "Confirm code" }).click();
    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 15_000 });
  } else {
    console.log("Verification already submitted in an earlier run; skipping submit+confirm.", { alreadyPending, alreadyVerified });
  }

  // Admin approves.
  await switchAccount(page);
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const mfaField = page.getByLabel(/6-digit code/i);
  const mfaShown = await mfaField.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  if (mfaShown) {
    await mfaField.click();
    await mfaField.pressSequentially(await totp(), { delay: 50 });
    await expect(mfaField).toHaveValue(/^\d{6}$/);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.waitForURL(/admin/, { timeout: 20_000 });

  if (!alreadyVerified) {
    await page.goto("/admin/verification");
    await expect(page.getByText("BrightPeak").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Approve" }).click();
    const approvedRadio = page.getByRole("radio", { name: "Approved" });
    if (await approvedRadio.isVisible().catch(() => false)) await approvedRadio.click();
    const confirmBtn = page.getByRole("button", { name: /Confirm|Approve|Submit/i }).last();
    await confirmBtn.click().catch(() => {});
  }

  // Company sees Verified, posts a job.
  await switchAccount(page);
  await page.getByLabel("Email address").fill(COMPANY_EMAIL);
  await page.getByLabel("Password").fill(COMPANY_PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/enterprise/, { timeout: 20_000 });

  await page.goto("/enterprise/admin/company");
  await expect(page.getByText("Verified", { exact: true })).toBeVisible({ timeout: 15_000 });

  // Post a job with a pay range, then open it.
  await page.goto("/enterprise/postings/new");
  await expect(page.getByText("Post a new job")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Job title").fill("Robotics Test Engineer");
  await page.getByLabel("About the role").fill("Build and test robotics firmware for our warehouse automation line.");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("What it takes")).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder(/Good communication/i).fill("3+ years embedded C++");
  await page.getByRole("button", { name: /Add — Must-haves/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Where, pay and timing")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Location").fill("Hyderabad, India");
  await page.getByLabel("Pay range — from").fill("12");
  await page.getByLabel("Pay range — to").fill("18");
  await page.getByRole("button", { name: "Continue" }).click();

  const reviewOrPublish = page.getByRole("button", { name: /Review|Publish job/i }).last();
  await reviewOrPublish.click();
  const publishBtn = page.getByRole("button", { name: "Publish job" });
  const onReview = await publishBtn.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false);
  if (onReview) await publishBtn.click();

  await page.waitForURL(/enterprise\/postings\/[^/]+$/, { timeout: 20_000 });
  await expect(page.getByText("Robotics Test Engineer").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^Published$/).first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "/tmp/stepb-posting-published.png", fullPage: true });
});
