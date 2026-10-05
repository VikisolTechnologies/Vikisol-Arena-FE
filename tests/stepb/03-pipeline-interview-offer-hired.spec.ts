import { test, expect, type Page } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 3: applicant list (CTC shown only when included) -> screening -> interview (schedule;
// the candidate picks a slot) -> offer -> the candidate accepts -> Hired. Also reject with the
// kind message, and withdraw (the application disappears from the company's list).
//
// Applications were moved to "screening"/"interview" and interview slots proposed via curl
// before this test runs (setup, not something to re-prove live) - this test verifies what
// actually renders and behaves in the browser from there on: the CTC line, the candidate's
// slot-pick (freshly fixed in InterviewRoom.tsx - see the Step B item 3 commit), the company
// sending the offer, the candidate accepting into Hired, a reject with the kind message, and a
// withdraw disappearing from the company's applicant list.

const COMPANY_EMAIL = "priya@brightpeak.example";
const COMPANY_PASS = "LocalDemo123!";
const PASS = "LocalDemo123!";
const RAHUL_EMAIL = "rahul.nair.candidate@example.com"; // interview -> offer -> hired
const KABIR_EMAIL = "kabir.shah.candidate@example.com"; // withdraw path
const JOB_ID = "66b083c8-c8ba-4859-955a-a55a3938911c";
const RAHUL_APP_ID = "fbc02da0-fef0-4b0f-b753-cdb7e00f871a";
const MEERA_APP_ID = "d088ba71-85fe-4f49-bee1-7492b0d1919f";
const KABIR_APP_ID = "2e689fce-e52a-41cf-b060-882751783392";

async function dismissCookieBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
}

async function signIn(page: Page, email: string, password = PASS) {
  await page.context().clearCookies();
  await page.goto("/auth?mode=signin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await dismissCookieBanner(page);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20_000 });
}

test("applicant list shows CTC only when included", async ({ page }) => {
  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/postings/${JOB_ID}?tab=candidates`);
  const rahulCard = page.locator("li", { has: page.getByRole("link", { name: /Rahul Nair/ }) });
  await expect(rahulCard).toBeVisible({ timeout: 15_000 });
  await expect(rahulCard.getByText(/Current CTC ₹15 LPA/)).toBeVisible();
  const meeraCard = page.locator("li", { has: page.getByRole("link", { name: /Meera Iyer/ }) });
  await expect(meeraCard).toBeVisible();
  await expect(meeraCard.getByText(/Current CTC/)).toHaveCount(0);
});

test("candidate picks an interview slot, company sends offer, candidate accepts into Hired", async ({ page }) => {
  // Company side: confirm a time hasn't been picked yet (re-running this throwaway test against
  // an already-confirmed interview from a prior run is fine too - either state is valid here).
  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/interviews/${RAHUL_APP_ID}`);
  await expect(page.getByText(/Waiting for Rahul to pick a time|Interview with Rahul/)).toBeVisible({ timeout: 15_000 });

  // Candidate side: pick a slot if one isn't already confirmed. Before the fix in
  // InterviewRoom.tsx the "proposed" list had no buttons at all - the candidate had no way to
  // confirm a time; this proves the fix actually works against the real backend.
  await signIn(page, RAHUL_EMAIL);
  await page.goto(`/interviews/${RAHUL_APP_ID}`);
  const pickHeading = page.getByText("Pick a time");
  if (await pickHeading.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const slotButtons = page.getByRole("button").filter({ hasText: /min$/ });
    await expect(slotButtons.first()).toBeVisible();
    await slotButtons.first().click();
  }
  await expect(page.getByText(/Interview with/).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Pick a time")).toHaveCount(0);

  // Company side: send the offer now that a time is confirmed.
  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/interviews/${RAHUL_APP_ID}`);
  await expect(page.getByText(/Interview with Rahul/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Send offer" }).click();
  await expect(page.getByText("Waiting on the candidate to accept or decline.").or(page.getByText(/accept or decline/))).toBeVisible({ timeout: 10_000 });

  // Candidate side: accept the offer into Hired.
  await signIn(page, RAHUL_EMAIL);
  await page.goto(`/applications/${RAHUL_APP_ID}`);
  await expect(page.getByRole("button", { name: "Accept offer" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Accept offer" }).click();
  await expect(page.getByText(/[Hh]ired/)).toBeVisible({ timeout: 10_000 });
});

test("company rejects Meera with the kind message", async ({ page }) => {
  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/postings/${JOB_ID}/candidates/${MEERA_APP_ID}`);
  await expect(page.getByRole("heading", { name: "Meera Iyer" })).toBeVisible({ timeout: 15_000 });
  // Idempotent across reruns: a prior run may have already rejected her.
  const notSelectedBtn = page.getByRole("button", { name: "Not selected" });
  if (await notSelectedBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notSelectedBtn.click();
    await expect(page.getByText(/A kind message/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Not selected: Meera/ })).toBeVisible();
    await page.getByRole("button", { name: /Mark not selected/ }).click();
  }
  await expect(page.getByLabel("Stages").getByText("Not selected")).toBeVisible({ timeout: 10_000 });
});

test("candidate withdraws, application disappears from the company's list", async ({ page }) => {
  await signIn(page, KABIR_EMAIL);
  await page.goto(`/applications/${KABIR_APP_ID}`);
  await expect(page.getByRole("button", { name: "Withdraw application" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Withdraw application" }).click();
  await expect(page.getByRole("dialog", { name: "Withdraw application" }).getByRole("button", { name: "Withdraw" })).toBeVisible();
  await page.getByRole("dialog", { name: "Withdraw application" }).getByRole("button", { name: "Withdraw" }).click();

  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/postings/${JOB_ID}?tab=candidates`);
  await expect(page.getByText("Kabir Shah")).toHaveCount(0, { timeout: 10_000 });
});
