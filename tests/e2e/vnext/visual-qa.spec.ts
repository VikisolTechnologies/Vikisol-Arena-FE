import { expect, test, type Page } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

const LOGGED_OUT = ["/", "/home", "/map", "/work", "/identity"];
const TALENT = ["/home", "/discover", "/map", "/work", "/identity"];

test.describe("visual QA, logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of LOGGED_OUT) {
    test(`${route} renders`, async ({ page }, info) => {
      await shoot(page, info.project.name, "guest", route);
    });
  }
});

test.describe("visual QA, talent", () => {
  test.use({ storageState: DEMO_ACCOUNTS.talent.storageStatePath });

  for (const route of TALENT) {
    test(`${route} renders`, async ({ page }, info) => {
      await shoot(page, info.project.name, "talent", route);
    });
  }
});

test.describe("visual QA, company", () => {
  test.use({ storageState: DEMO_ACCOUNTS.company_admin.storageStatePath });

  test("postings render", async ({ page }, info) => {
    await shoot(page, info.project.name, "company", "/enterprise/postings");
  });
});

async function shoot(page: Page, project: string, role: string, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  await accept.waitFor({ state: "visible", timeout: 4000 }).then(() => accept.click()).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
  await expect(page.getByText("Loading", { exact: true })).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator("body")).not.toContainText("Application error");
  const name = `${project}-${role}-${route === "/" ? "landing" : route.slice(1).replace(/\//g, "-")}.png`;
  await page.screenshot({ path: `test-results/visual/${name}`, fullPage: false });
}
