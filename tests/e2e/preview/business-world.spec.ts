import { test, expect, type Page } from "@playwright/test";

/** One coherent GreenLeaf world across Home, Overview, Billing, Messages and the pipeline (review 3 items 4, 5, 10). */
const open = async (page: Page, to: string) => {
  await page.goto(`/dev/business?to=${encodeURIComponent(to)}`);
  await page.waitForURL((u) => u.pathname === to.split("?")[0], { timeout: 30_000 });
};

test("unlock credits and the plan agree everywhere", async ({ page }) => {
  await open(page, "/enterprise/dashboard");
  await expect(page.getByText("Unlock credits left")).toBeVisible();
  await expect(page.getByText("43", { exact: true }).first()).toBeVisible();
  await open(page, "/enterprise/admin/billing");
  await expect(page.getByText("of 50 credits left")).toBeVisible();
  await expect(page.getByText("43", { exact: true }).first()).toBeVisible();
  await open(page, "/enterprise/admin");
  await expect(page.getByText("of 50 left")).toBeVisible();
  await expect(page.getByText("43", { exact: true }).first()).toBeVisible();
});

test("Overview counts what the pipeline shows", async ({ page }) => {
  await open(page, "/enterprise/admin");
  await expect(page.getByText("Jobs posted")).toBeVisible();
  const stat = (label: string) =>
    page.evaluate((l) => {
      const el = [...document.querySelectorAll("body *")].find((e) => e.children.length === 0 && e.textContent?.trim() === l);
      return Number(/\d+/.exec(el?.parentElement?.textContent ?? "")?.[0] ?? NaN);
    }, label);
  await expect.poll(() => stat("Jobs posted")).toBe(1); // counts up on screen
  await expect.poll(() => stat("Candidates moved")).toBe(6); // counts up on screen
  await expect.poll(() => stat("Interviews")).toBe(1); // counts up on screen
  await expect.poll(() => stat("Profiles unlocked")).toBe(7); // counts up on screen
});

test("Messages holds only GreenLeaf's own candidate threads", async ({ page }) => {
  await open(page, "/enterprise/messages");
  await expect(page.getByText("Arjun Nair").first()).toBeVisible();
  await expect(page.getByText("Lakeshore")).toHaveCount(0);
});

test("the pipeline supports Hired (board and list), with no 'use Offer' note", async ({ page }) => {
  await open(page, "/enterprise/postings/demo-job?tab=candidates");
  await expect(page.getByText("Hired isn't a stage")).toHaveCount(0);
  await expect(page.getByText("Lakshmi Devi").first()).toBeVisible();
  await expect(page.getByText("Hired", { exact: true }).first()).toBeVisible();
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByText("Hired").first()).toBeVisible();
});

test("a booked interview shows on a clean time", async ({ page }) => {
  await open(page, "/enterprise/interviews");
  await expect(page.getByText("Arjun Nair").first()).toBeVisible();
  const text = await page.getByText(/\b\d{1,2}:\d{2}\s?(AM|PM)/i).first().innerText();
  expect(text).toMatch(/:(00|30)\s?(AM|PM)/i);
});
