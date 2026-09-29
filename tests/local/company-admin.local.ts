import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P9 — Arena for Business company settings: overview, team (invite validates after blur,
// remove asks first), audit in plain words, billing display-only, consent. Real API mode.

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

type Call = { method: string; path: string; body: unknown };
const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

async function setup(page: Page, calls: Call[], role = "company_admin") {
  let team = [
    { membershipId: "m0", userId: "u0", name: "Alex Rao", email: "alex@greenleaf.example", role: "company_admin", status: "active", joinedAt: ago(60) },
    { membershipId: "m1", userId: "u1", name: "Neha Iyer", email: "neha@greenleaf.example", role: "recruiter", status: "active", joinedAt: ago(20) },
  ];
  const invites: Record<string, unknown>[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    if (path === "/enterprise/profile/me") data = { companyName: "GreenLeaf Labs", logoEmoji: "g", industry: "Sales", size: "11-50", hiringFor: ["Community"], plan: "pro", seatsUsed: 2, seatsTotal: 5, unlockCreditsUsed: 3, unlockCreditsTotal: 50, status: "active" };
    else if (path === "/enterprise/admin/dashboard") data = { rangeDays: 30, totals: { postings: 4, unlocks: 3, stageMoves: 17, interviews: 5, messages: 22 }, recruiterActivity: [{ userId: "u1", name: "Neha Iyer", role: "recruiter", postings: 4, unlocks: 3, stageMoves: 17, interviewsHeld: 5, messagesSent: 22, avgHoursBetweenStageMoves: 7.5 }], creditsBalance: 47, creditsTotal: 50, creditsSpentInRange: 3 };
    else if (path === "/enterprise/admin/team") data = team;
    else if (path === "/enterprise/admin/team/invitations") data = invites;
    else if (path === "/enterprise/admin/team/invite") {
      const inv = { id: "i1", ...(body as object), inviteLink: "https://arena.example/invite/i1", status: "pending", expiresAt: ago(-7), invitedByName: "Alex Rao", createdAt: ago(0) };
      invites.push(inv);
      data = inv;
    } else if (path === "/enterprise/admin/team/m1" && req.method() === "DELETE") {
      team = team.filter((t) => t.membershipId !== "m1");
      data = null;
    } else if (path === "/enterprise/admin/audit") data = { content: [{ id: "e1", actorName: "Neha Iyer", action: "stage.moved", target: "Priya Sharma on Community Program Assistant", createdAt: ago(1) }], totalElements: 1, totalPages: 1, number: 0, size: 20 };
    else if (path === "/enterprise/admin/billing") data = { plan: "pro", seatsUsed: 2, seatsTotal: 5, creditsUsed: 3, creditsTotal: 50, invoices: [{ id: "INV-1", date: "1 Sep 2026", amount: "₹4,999", status: "paid" }] };
    else if (path === "/enterprise/admin/consent") data = [{ candidateId: "c1", candidateName: "Priya Sharma", unlockedAt: ago(3), stillConsenting: true }, { candidateId: "c2", candidateName: "Arjun Nair", unlockedAt: ago(9), stillConsenting: false }];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate((r) => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: r, name: "Alex Rao", email: "alex@greenleaf.example" }));
    localStorage.setItem("arena_enterprise_onboarded", "true");
  }, role);
}

test("overview, team invite + remove, audit, billing (display only), consent", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/enterprise/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Neha Iyer/ })).toBeVisible();
  await noSeriousA11y(page);

  await page.goto("/enterprise/admin/team");
  await expect(page.getByText("Neha Iyer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Invite" }).click();
  const sheet = page.getByRole("dialog", { name: "Invite a teammate" });
  await sheet.getByLabel("Work email").fill("not-an-email");
  await sheet.getByLabel("Work email").blur();
  await expect(sheet.getByText("Enter a work email, like name@company.com.")).toBeVisible();
  await sheet.getByLabel("Work email").fill("sam@greenleaf.example");
  await sheet.getByRole("radio", { name: /Hiring manager/ }).click();
  await noSeriousA11y(page);
  await sheet.getByRole("button", { name: "Create invite link" }).click();
  await expect(page.getByText("sam@greenleaf.example")).toBeVisible();
  expect(calls.find((c) => c.path === "/enterprise/admin/team/invite")?.body).toEqual({ email: "sam@greenleaf.example", role: "hiring_manager" });

  await page.getByRole("button", { name: "Remove Neha Iyer" }).click();
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  await page.getByRole("dialog", { name: "Remove teammate" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Neha Iyer", { exact: true })).toHaveCount(0);

  await page.goto("/enterprise/admin/audit");
  await expect(page.getByRole("listitem").getByText("Moved a candidate")).toBeVisible();
  await expect(page.getByText("stage.moved")).toHaveCount(0);
  await noSeriousA11y(page);

  await page.goto("/enterprise/admin/billing");
  await expect(page.getByText("Your plan")).toBeVisible();
  await expect(page.getByRole("button", { name: /Switch to/ })).toHaveCount(0);
  await noSeriousA11y(page);

  await page.goto("/enterprise/admin/consent");
  await expect(page.getByText("Withdrawn")).toBeVisible();
  await expect(page.getByText(/deleted 12 months after a role closes/)).toBeVisible();
  await noSeriousA11y(page);
});

test("a recruiter can't open company settings", async ({ page }) => {
  await setup(page, [], "recruiter");
  await page.goto("/enterprise/admin/team");
  await expect(page.getByText("Neha Iyer", { exact: true })).toHaveCount(0);
});
