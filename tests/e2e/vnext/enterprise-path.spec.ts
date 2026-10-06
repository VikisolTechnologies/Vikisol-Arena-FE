import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";
import { api, signIn } from "./liveApi";

/**
 * Company posts a labelled test role, a recruiter reviews it through interview,
 * and the candidate is moved to offer. The posting is closed and the application
 * withdrawn so it does not stay in the live list.
 */
test.describe("enterprise path", () => {
  test.use({ storageState: DEMO_ACCOUNTS.company_admin.storageStatePath });
  test.setTimeout(120_000);

  test("post, review, interview, hire", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Runs once, on the desktop project.");
    const stamp = Date.now();
    const title = `TEST B2 role ${stamp}`;
    const cleanup: string[] = [];
    let jobId = "";
    let applicationId = "";
    let companyToken = "";
    let talentToken = "";

    try {
      await page.goto("/enterprise/postings");
      await expect(page.getByRole("button", { name: "New posting" })).toBeVisible({ timeout: 20_000 });
      companyToken = await page.evaluate(() => localStorage.getItem("arena_jwt_token") || "");
      await page.getByRole("button", { name: "New posting" }).click();
      await page.getByPlaceholder("e.g. Senior backend engineer").fill(title);
      await page.getByPlaceholder("Role, responsibilities, what makes this team worth joining").fill(`${title}. Ignore this test role.`);
      await page.getByPlaceholder("Skills, comma-separated — e.g. Java, Spring Boot").fill("Testing");
      await page.getByPlaceholder("Location").fill("Hyderabad");
      await page.getByPlaceholder("Salary min (LPA)").fill("6");
      await page.getByPlaceholder("Salary max (LPA)").fill("8");
      await page.getByRole("button", { name: "Publish posting" }).click();
      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("Rendering")).toHaveCount(0);
      const mine = await api<{ content: { id: string; title: string }[] }>("/enterprise/postings?page=0&size=50", companyToken);
      jobId = mine.content.find((row) => row.title === title)?.id || "";
      expect(jobId).not.toBe("");
      await page.getByText(title, { exact: true }).locator("xpath=ancestor::div[contains(@class,'rounded-[24px]')][1]").getByRole("button", { name: "Applicants" }).click();
      if (!page.url().endsWith(jobId)) await page.goto(`/enterprise/postings/${jobId}`);
      await expect(page).toHaveURL(new RegExp(`/enterprise/postings/${jobId}$`), { timeout: 15_000 });

      const talent = await signIn(DEMO_ACCOUNTS.talent.email, DEMO_ACCOUNTS.talent.password);
      talentToken = talent.token;
      const application = await api<{ id: string }>("/applications", talent.token, {
        method: "POST",
        body: JSON.stringify({ jobId }),
      });
      applicationId = application.id;

      await page.reload();
      await expect(page.getByText("Aarav Sharma").first()).toBeVisible({ timeout: 20_000 });
      await page.getByRole("button", { name: /Advance/ }).click();
      await expect(page.getByText("screening", { exact: true }).locator("xpath=ancestor::div[contains(@class,'w-[260px]')]").getByText("Aarav Sharma")).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: /Advance/ }).click();
      await expect(page.getByText("Compiling")).toHaveCount(0, { timeout: 30_000 });
      await page.getByRole("button", { name: "Join interview" }).click();
      await expect(page).toHaveURL(/\/enterprise\/interviews\//, { timeout: 30_000 });
      await page.goto(`/enterprise/postings/${jobId}`);
      await page.getByRole("button", { name: /Advance/ }).click();
      await expect(page.locator("div.w-\\[260px\\]", { hasText: "offer" }).getByText("Aarav Sharma")).toBeVisible({ timeout: 15_000 });
    } finally {
      if (talentToken && applicationId) {
        cleanup.push(`application ${applicationId} ${await safe(() => api(`/applications/${applicationId}`, talentToken, { method: "DELETE" }))}`);
      }
      if (companyToken && jobId) {
        cleanup.push(`posting ${jobId} ${await safe(() => api(`/enterprise/postings/${jobId}/status`, companyToken, { method: "PUT", body: JSON.stringify({ status: "closed" }) }))}`);
      }
      fs.mkdirSync("test-results", { recursive: true });
      fs.writeFileSync(path.join("test-results", "b4-enterprise-cleanup.json"), JSON.stringify({ stamp, title, jobId, cleanup }, null, 2));
    }
  });
});

async function safe(run: () => Promise<unknown>) {
  try {
    await run();
    return "removed";
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : "unknown"}`;
  }
}
