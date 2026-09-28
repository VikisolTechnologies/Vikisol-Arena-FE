import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// B+ P6 — Career (intent → career intake → visibility preview → publish; jobs → apply → track).
// Real API mode, every call intercepted; asserts exactly what is and isn't sent.

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

type Call = { method: string; path: string; body: unknown };
const now = () => new Date().toISOString();
const job = (id: string, over: Record<string, unknown> = {}) => ({ id, title: "Product Designer", company: "GreenLeaf Labs", companyEmoji: "g", industry: "Design", location: "Gachibowli", remote: false, employmentType: "Full Time", salaryMin: 14, salaryMax: 22, skills: ["Figma", "UX research", "Prototyping"], description: "Design for sustainable living.", postedDaysAgo: 1, matchPercentage: 0, ...over });

async function setup(page: Page, calls: Call[]) {
  let apps: Record<string, unknown>[] = [];
  let consent = { autoApply: false, searchableByEnterprises: false };
  const profile = () => ({ id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Product Designer", industry: "Design", location: "", homeCity: "Gachibowli", remote: false, skills: [{ name: "Figma" }], experienceYears: 4, rateFloor: 10, openTo: [], careerHealth: 0, consent, autonomy: "manual" });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/jobs") data = { content: [job("j1"), job("j2", { title: "Backend Developer", company: "MapMyLane", remote: true, skills: ["Java"] })], totalElements: 2, totalPages: 1, number: 0, size: 200 };
    else if (path === "/jobs/j1") data = job("j1");
    else if (path === "/applications" && req.method() === "GET") data = { content: apps, totalElements: apps.length, totalPages: 1, number: 0, size: 100 };
    else if (path === "/applications" && req.method() === "POST") {
      const a = { id: "a1", jobId: "j1", stage: "APPLIED", appliedAt: now(), updatedAt: now() };
      apps = [a];
      data = a;
    } else if (path === "/applications/a1" && req.method() === "DELETE") { apps = []; data = null; }
    else if (path === "/profile/me/consent") { consent = body as typeof consent; data = profile(); }
    else if (path.startsWith("/profile/me")) data = profile();
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "talent", name: "Priya Sharma", email: "priya@example.com" }));
    localStorage.setItem("arena_onboarded", "true");
  });
}

test("career: intent → intake → visibility → publish sends only what the API should store", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/identity/career");
  await expect(page.getByRole("heading", { name: "What do you want to do with your career on Arena?" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("radio", { name: /Find a job/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Set up your job preferences" })).toBeVisible();
  await expect(page.getByLabel("Current or most recent title")).toHaveValue("Product Designer");
  await page.getByLabel("Current company").fill("Secret Co");
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Where you are right now" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose one to continue.")).toBeVisible();
  await page.getByRole("radio", { name: "Serving notice" }).click();
  await expect(page.getByLabel("Last working day")).toBeVisible();
  await page.getByRole("radio", { name: "30 days" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Role family").selectOption("Design");
  await page.getByRole("button", { name: "+ UX research" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Current CTC (fixed)").fill("18");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Review" }).click();

  await expect(page.getByRole("heading", { name: "Check your answers" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Preview visibility" }).click();

  await expect(page.getByRole("heading", { name: "Preview your visibility" })).toBeVisible();
  await page.getByRole("switch", { name: "Open to work" }).click();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Publish career profile" }).click();
  await expect(page).toHaveURL(/\/jobs\?published=1/);

  const details = calls.find((c) => c.path === "/profile/me/details")?.body as Record<string, unknown>;
  expect(details).toMatchObject({ title: "Product Designer", cameForJob: true, openTo: ["full-time"], experienceYears: 4 });
  expect(JSON.stringify(details)).not.toContain("Secret Co");
  expect(details).not.toHaveProperty("currentCtc", 18);
  expect(calls.find((c) => c.path === "/profile/me/skills")?.body).toEqual({ skills: ["Figma", "UX research"] });
  expect(calls.find((c) => c.path === "/profile/me/consent")?.body).toMatchObject({ searchableByEnterprises: true });
  await expect(page.getByText("Your career profile is published.")).toBeVisible();
});

test("jobs → details → apply with consent → track → withdraw", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: /Product Designer/ })).toBeVisible();
  await expect(page.getByText(/%/)).toHaveCount(0);
  await noSeriousA11y(page);
  await page.getByRole("radio", { name: "Remote" }).click();
  await expect(page.getByRole("link", { name: /Backend Developer/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Product Designer/ })).toHaveCount(0);

  await page.goto("/jobs/j1");
  await expect(page.getByRole("heading", { name: "Product Designer" })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Apply" }).click();
  const sheet = page.getByRole("dialog", { name: /Apply to Product Designer/ });
  await sheet.getByRole("button", { name: "Send application" }).click();
  await expect(sheet.getByText("Tick to agree before applying.")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/applications")).toBe(false);
  await sheet.getByText(/I agree to share these details/).click();
  await sheet.getByRole("button", { name: "Send application" }).click();
  await expect(sheet.getByRole("heading", { name: "Application sent" })).toBeVisible();
  expect(calls.find((c) => c.method === "POST" && c.path === "/applications")?.body).toEqual({ jobId: "j1" });

  await sheet.getByRole("link", { name: "Track my application" }).click();
  await expect(page.getByRole("heading", { name: "My application" })).toBeVisible();
  await expect(page.getByText("Application submitted")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Withdraw application" }).click();
  await page.getByRole("dialog", { name: "Withdraw application" }).getByRole("button", { name: "Withdraw" }).click();
  await expect(page).toHaveURL(/\/work/);
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/applications/a1")).toBe(true);
});
