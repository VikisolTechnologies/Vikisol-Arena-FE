import { test, expect } from "@playwright/test";

/** Business pages nested under a titled layout keep the "· Arena for Business" suffix. */
test("nested business pages have their own full titles", async ({ page }) => {
  const cases: [string, string][] = [
    ["/enterprise/postings", "Jobs · Arena for Business"],
    ["/enterprise/postings/new", "Post a job · Arena for Business"],
    ["/enterprise/postings/demo-job", "Manage job · Arena for Business"],
    ["/enterprise/postings/demo-job/candidates/demo-app-0", "Candidate profile · Arena for Business"],
  ];
  for (const [path, title] of cases) {
    await page.goto(`/dev/business?to=${encodeURIComponent(path)}`);
    await page.waitForURL((u) => u.pathname === path, { timeout: 30_000 });
    await expect(page).toHaveTitle(title);
  }
});
