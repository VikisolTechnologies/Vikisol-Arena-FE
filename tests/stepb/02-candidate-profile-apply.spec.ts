import { test, expect } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 2: candidate career profile, resume upload, apply once with "include my CTC", once
// without (as a second candidate, since the backend caps Company A's free plan at one open
// posting, so the "with/without CTC" pair is exercised across two applicants to the same job
// rather than the same candidate applying twice to two jobs).

const CANDIDATE1_EMAIL = "rahul.nair.candidate@example.com";
const CANDIDATE2_EMAIL = "meera.iyer.candidate@example.com";
const PASS = "LocalDemo123!";
const JOB_TITLE = "Robotics Test Engineer";

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/auth?mode=signin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await dismissCookieBanner(page);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASS);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("candidate 1: career profile, resume upload, apply with CTC included", async ({ page }) => {
  await signIn(page, CANDIDATE1_EMAIL);
  await page.waitForURL(/\/(onboarding|identity|feed|discover)/, { timeout: 20_000 }).catch(() => {});

  await page.goto("/identity/career?step=intent");
  await expect(page.getByText("Find a job")).toBeVisible({ timeout: 15_000 });
  await page.getByText("Find a job").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: basics
  await expect(page.getByText("Set up your job preferences")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Current or most recent title").fill("Robotics Engineer");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: status
  await expect(page.getByText("Where you are right now")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("radio", { name: "Between jobs" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: skills
  await expect(page.getByText("Skills & stack")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Role family").selectOption({ label: "Engineering" });
  const skillInput = page.getByPlaceholder("Add a skill");
  await skillInput.fill("Embedded C++");
  await skillInput.press("Enter");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: pay (set currentCtc so the Apply sheet's CTC checkbox appears).
  await expect(page.getByText("Compensation")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Current CTC (fixed)").fill("15");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: prefs (desired roles required)
  await expect(page.getByText("What you're looking for")).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder(/Senior Product Designer/i).fill("Robotics Engineer");
  await page.getByRole("button", { name: /Add — Desired roles/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step: proof (resume upload).
  await expect(page.getByText("Resume & proof")).toBeVisible({ timeout: 10_000 });
  await page.locator('input[type="file"]').setInputFiles("/tmp/stepb-resume.pdf");
  await expect(page.getByText("stepb-resume.pdf")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Preview visibility" }).click();

  // Privacy / publish.
  await expect(page.getByText("Preview your visibility")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Publish career profile" }).click();
  await page.waitForURL(/\/jobs/, { timeout: 20_000 });

  // Apply to the real BrightPeak job, with CTC included.
  await page.goto("/jobs");
  await page.getByText(JOB_TITLE).first().click();
  await page.waitForURL(/\/jobs\/.+/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/Apply to Robotics Test Engineer/)).toBeVisible({ timeout: 10_000 });
  const ctcCheckbox = page.getByText(/Include my CTC/i);
  await expect(ctcCheckbox).toBeVisible({ timeout: 10_000 });
  await ctcCheckbox.click();
  await page.getByText(/I agree to share these details/i).click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Application sent")).toBeVisible({ timeout: 15_000 });
});

test("candidate 2: apply without including CTC (profile has no CTC set)", async ({ page }) => {
  await signIn(page, CANDIDATE2_EMAIL);
  await page.waitForURL(/\/(onboarding|identity|feed|discover)/, { timeout: 20_000 }).catch(() => {});

  await page.goto("/jobs");
  await page.getByText(JOB_TITLE).first().click();
  await page.waitForURL(/\/jobs\/.+/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/Apply to Robotics Test Engineer/)).toBeVisible({ timeout: 10_000 });
  // Meera's profile has no currentCtc/expectedCtc set (curl-seeded) - the CTC checkbox must not
  // appear at all per hasCtc gating in JobDetailScreen.tsx.
  await expect(page.getByText(/Include my CTC/i)).toHaveCount(0);
  await page.getByText(/I agree to share these details/i).click();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Application sent")).toBeVisible({ timeout: 15_000 });
});
