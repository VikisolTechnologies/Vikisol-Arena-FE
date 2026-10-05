import { test, expect, type Page } from "@playwright/test";

// THROWAWAY Step B verification: real local backend (localhost:8081), real FE, real accounts.
// Item 4 (connect requests): ConnectController had zero FE code before this - built from the
// backend contract live. A connect request was already sent+accepted via curl before this test
// (fast, repeatable setup - connect.ts's wire shapes were proven against the real backend that
// way too); this test verifies what actually renders: the candidate's connect-requests list
// shows the accepted request with a working Message link, and the company's talent profile page
// renders the Connect/Message gating UI correctly.

const COMPANY_EMAIL = "priya@brightpeak.example";
const COMPANY_PASS = "LocalDemo123!";
const PASS = "LocalDemo123!";
const RAHUL_EMAIL = "rahul.nair.candidate@example.com";
const RAHUL_CANDIDATE_ID = "c474878f-0639-4e97-9318-8c6128bf8733";

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

test("candidate sees the accepted connect request with a working Message link", async ({ page }) => {
  await signIn(page, RAHUL_EMAIL);
  await page.goto("/connect-requests");
  await expect(page.getByRole("heading", { name: "Connect requests" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("BrightPeak Robotics Pvt Ltd")).toBeVisible();
  await expect(page.getByText(/We loved your profile/)).toBeVisible();
  await expect(page.getByText("Accepted")).toBeVisible();
  await expect(page.getByRole("link", { name: /Message/ })).toBeVisible();
});

test("company's talent profile reveals the accepted status on re-send (ConnectService.send is idempotent)", async ({ page }) => {
  // The backend has no GET for "my connect status with this one candidate" - only the
  // candidate-side "mine" list and an idempotent POST /connect that returns the existing row
  // unchanged if one's already there. So a freshly loaded talent profile can't know in advance
  // that this candidate already accepted; clicking Connect again is how the real status surfaces,
  // without creating a duplicate request server-side. Logged as a minor gap in API-ISSUES.md.
  await signIn(page, COMPANY_EMAIL, COMPANY_PASS);
  await page.goto(`/enterprise/talent/${RAHUL_CANDIDATE_ID}`);
  await expect(page.getByRole("heading", { name: "Rahul Nair" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByLabel("Note").fill("Following up - are you still open to this role?");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("link", { name: "Message", exact: true })).toBeVisible({ timeout: 10_000 });
});
