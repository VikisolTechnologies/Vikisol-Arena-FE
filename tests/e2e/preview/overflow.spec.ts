import { test, expect } from "@playwright/test";
import screens from "../../../src/lib/dev/screens.json";

/** No business screen scrolls sideways at phone width (review 3 item 3: biz-interviews was 435px wide). */
const BUSINESS = [
  ...new Set([
    ...(screens as { route: string | null }[]).map((s) => s.route).filter((r): r is string => !!r && r.startsWith("/dev/business?to=")).map((r) => decodeURIComponent(r.split("to=")[1])),
    "/enterprise/dashboard",
    "/enterprise/postings",
    "/enterprise/postings/new",
    "/enterprise/postings/demo-job",
    "/enterprise/postings/demo-job?tab=candidates",
    "/enterprise/candidates",
    "/enterprise/interviews",
    "/enterprise/messages",
    "/enterprise/talent",
    "/enterprise/posts",
    "/enterprise/admin",
    "/enterprise/admin/team",
    "/enterprise/admin/audit",
    "/enterprise/admin/billing",
    "/enterprise/admin/company",
    "/enterprise/admin/consent",
  ]),
];

test.use({ viewport: { width: 390, height: 844 } });

for (const route of BUSINESS) {
  test(`no horizontal overflow: ${route}`, async ({ page }) => {
    await page.goto(`/dev/business?to=${encodeURIComponent(route)}`);
    await page.waitForURL((u) => u.pathname === route.split("?")[0], { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const { scroll, client, worst } = await page.evaluate(() => {
      const c = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")].filter((e) => !(e instanceof SVGElement) && e.getBoundingClientRect().right > c + 1 && !e.closest("[tabindex='0'][role='region'], [class*='overflow-x-auto']"));
      return { scroll: document.documentElement.scrollWidth, client: c, worst: wide.slice(0, 3).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}`) };
    });
    expect(scroll, `wider than the screen: ${worst.join(", ")}`).toBeLessThanOrEqual(client);
  });
}

test("the Overview team activity is readable at phone width (no cut-off column)", async ({ page }) => {
  await page.goto(`/dev/business?to=${encodeURIComponent("/enterprise/admin")}`);
  await page.waitForURL(/enterprise\/admin/);
  const list = page.getByRole("list", { name: "Team activity" });
  await expect(list).toBeVisible();
  await expect(list.getByText("Avg. between moves").first()).toBeVisible();
});
