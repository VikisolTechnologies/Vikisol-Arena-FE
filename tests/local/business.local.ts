import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P7/P9 — Arena for Business: jobs list → job page (funnel, share) → candidates (list, evidence
// filters, bulk move) → candidate profile → Not selected always goes through the kind message.
// Real API mode, every call intercepted.

async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 140)).join(" | ")}`)).toEqual([]);
}

type Call = { method: string; path: string; body: unknown };
const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const person = (id: string, name: string, skills: string[], over: Record<string, unknown> = {}) => ({ id, name, avatarEmoji: "p", title: "Community associate", industry: "Sales", location: "Gachibowli", remote: false, skills: skills.map((s) => ({ name: s })), experienceYears: 2, rateFloor: 3, openTo: ["full-time"], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: true }, autonomy: "manual", ...over });
const posting = { id: "job1", title: "Community Program Assistant", industry: "Sales", location: "Gachibowli, Hyderabad", remote: false, employmentType: "Full Time", salaryMin: 3, salaryMax: 4, skills: ["Communication", "Event planning", "MS Office"], description: "Help run neighbourhood programs.\n\nMust-haves:\n• Communication\n• Event planning\n• MS Office\n\nExperience: Entry level (0–2 years)", status: "open", createdAt: days(10) };

async function setup(page: Page, calls: Call[], stageForA1 = "applied") {
  const apps = [
    { id: "a1", candidateId: "c1", postingId: "job1", stage: "applied", appliedAt: days(1), updatedAt: days(1), candidate: person("c1", "Priya Sharma", ["Communication", "Event planning"]) },
    { id: "a2", candidateId: "c2", postingId: "job1", stage: "screening", appliedAt: days(2), updatedAt: days(1), candidate: person("c2", "Arjun Nair", ["Communication", "MS Office", "Event planning"], { experienceYears: 4 }) },
    { id: "a3", candidateId: "c3", postingId: "job1", stage: "applied", appliedAt: days(5), updatedAt: days(5), candidate: person("c3", "Meera Khan", ["Planning"]) },
  ];
  const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
  let interview: Record<string, unknown> = { id: "iv1", applicationId: "a1", proposedSlots: [{ id: "s1", start, durationMinutes: 45 }], confirmedSlotId: "s1", status: "confirmed", meetingLink: "https://meet.example.org/iv1" };
  apps[0].stage = stageForA1;
  let shortlist: string[] = [];
  let companyPosts: Record<string, unknown>[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = [];
    const m = path.match(/^\/enterprise\/applicants\/(\w+)\/stage$/);
    if (path === "/enterprise/profile/me") data = { companyName: "GreenLeaf Labs", logoEmoji: "g", industry: "Sales", size: "11-50", hiringFor: [], plan: "pro", seatsUsed: 2, seatsTotal: 5, unlockCreditsUsed: 0, unlockCreditsTotal: 10, status: "active" };
    else if (path === "/enterprise/postings") data = { content: [posting], totalElements: 1, totalPages: 1, number: 0, size: 100 };
    else if (path === "/enterprise/postings/job1") data = posting;
    else if (path === "/enterprise/postings/job1/applicants") data = { content: apps, totalElements: apps.length, totalPages: 1, number: 0, size: 100 };
    else if (path === "/enterprise/talent/search") data = { content: apps.map((a) => ({ candidate: a.candidate, matchPercentage: 91, fitBlurb: "x", availability: "full-time" })), totalElements: 3, totalPages: 1, number: 0, size: 50 };
    else if (path === "/enterprise/shortlist") data = shortlist;
    else if (path.match(/^\/enterprise\/shortlist\/\w+\/toggle$/)) { const cid = path.split("/")[3]; shortlist = shortlist.includes(cid) ? shortlist.filter((x) => x !== cid) : [...shortlist, cid]; data = shortlist; }
    else if (path === "/companies/me/posts" && req.method() === "GET") data = { content: companyPosts, totalElements: companyPosts.length, totalPages: 1, number: 0, size: 20 };
    else if (path === "/companies/me/posts" && req.method() === "POST") { const b = body as { body: string; tags: string[] }; companyPosts = [{ id: "cp1", body: b.body, tags: b.tags, createdAt: new Date().toISOString(), reactionCount: 0, commentCount: 0, status: "open" }, ...companyPosts]; data = companyPosts[0]; }
    else if (path.startsWith("/enterprise/talent/")) data = apps.find((a) => path.endsWith(a.candidateId))?.candidate ?? null;
    else if (path === "/enterprise/applicants/a1") data = { id: "a1", jobPostingId: "job1", candidateId: "c1", stage: apps[0].stage, appliedAt: days(1) };
    else if (path === "/interviews/by-application/a1") data = interview;
    else if (path === "/interviews/iv1/feedback") {
      interview = { ...interview, status: "completed", feedback: { ...(body as object), submittedAt: new Date().toISOString() } };
      apps[0].stage = (body as { recommendation: string }).recommendation === "advance" ? "offer" : apps[0].stage;
      data = interview;
    } else if (m) {
      const a = apps.find((x) => x.id === m[1]);
      if (a) a.stage = (body as { stage: string }).stage;
      data = null;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/auth");
  await page.evaluate(() => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: "recruiter", name: "Alex Rao", email: "alex@greenleaf.example" }));
    localStorage.setItem("arena_enterprise_onboarded", "true");
  });
}

test("jobs → job page funnel → candidates list with evidence filter → bulk move", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/enterprise/postings");
  await expect(page.getByRole("heading", { name: "Community Program Assistant" })).toBeVisible();
  await expect(page.getByText("3 applicants")).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole("link", { name: "Open" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Community Program Assistant" })).toBeVisible();
  const funnel = page.getByRole("list", { name: "Applicants by stage" });
  await expect(funnel.getByRole("button", { name: /2\s*New/ })).toBeVisible();
  await expect(page.getByText("Entry level (0–2 years)")).toBeVisible();
  await noSeriousA11y(page);

  await page.getByRole("radio", { name: "Candidates" }).click();
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByRole("link", { name: /Arjun Nair/ })).toBeVisible();
  await expect(page.getByText("Shows 3/3 must-haves")).toBeVisible();
  await expect(page.getByText("Not shown: Communication")).toBeVisible();
  await noSeriousA11y(page);

  await page.getByRole("button", { name: /Filter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filter candidates" });
  await expect(sheet.getByText(/never filters on age, gender, religion, caste or marital status/)).toBeVisible();
  await sheet.getByRole("button", { name: "MS Office" }).click();
  await sheet.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByRole("link", { name: /Arjun Nair/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Priya Sharma/ })).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Select Arjun Nair" }).check();
  await page.getByLabel("Move selected to").selectOption("interview");
  await expect.poll(() => calls.find((c) => c.method === "PUT" && c.path === "/enterprise/applicants/a2/stage")?.body).toEqual({ stage: "interview" });
});

test("candidate profile: evidence, private note, Not selected shows the kind message first", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/enterprise/postings/job1/candidates/a1");
  await expect(page.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();
  await expect(page.getByText("Consented information.")).toBeVisible();
  await expect(page.getByText(/MS Office — Not shown/).first()).toBeVisible();
  await noSeriousA11y(page);

  await page.getByRole("radio", { name: "Notes" }).click();
  await page.getByLabel("Add a note").fill("Ran two ward events last year.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Ran two ward events last year.")).toBeVisible();
  expect(calls.some((c) => JSON.stringify(c.body ?? "").includes("ward events"))).toBe(false);

  await page.getByRole("button", { name: "Not selected" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Mark Priya Sharma not selected" });
  await expect(sheet.getByText(/Hi Priya, thank you for applying for Community Program Assistant at GreenLeaf Labs/)).toBeVisible();
  expect(calls.some((c) => c.method === "PUT")).toBe(false);
  await noSeriousA11y(page);
  await sheet.getByRole("button", { name: "Mark not selected" }).click();
  await expect(sheet).toBeHidden();
  expect(calls.find((c) => c.method === "PUT" && c.path === "/enterprise/applicants/a1/stage")?.body).toEqual({ stage: "rejected" });
  await expect(page.getByRole("button", { name: "Reconsider" }).first()).toBeVisible();
});

test("desktop board: drag a card to Interview moves it (the menu does the same)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "drag is the desktop gesture; phones use the Move menu");
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/enterprise/postings/job1?tab=candidates");
  const card = page.getByRole("link", { name: /Priya Sharma/ });
  await expect(card).toBeVisible();
  const target = page.getByRole("region", { name: /^Interview: 0/ });
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x + to.width / 2 - from.x) * i) / 12, from.y + ((to.y + 120 - from.y) * i) / 12);
  await page.mouse.up();
  await expect.poll(() => calls.find((c) => c.method === "PUT" && c.path === "/enterprise/applicants/a1/stage")?.body).toEqual({ stage: "interview" });
  await expect(page.getByRole("region", { name: /^Interview: 1/ })).toBeVisible();
  await expect(page).toHaveURL(/tab=candidates$/);
});

test("interview & outcome: feedback per must-have (no score shown), then the stage follows", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls, "interview");
  await page.goto("/enterprise/interviews/a1");
  await expect(page.getByRole("heading", { name: "Interview & outcome" })).toBeVisible();
  await expect(page.getByText("Interview with Priya")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to calendar" })).toBeVisible();
  await noSeriousA11y(page);

  await page.getByRole("button", { name: "Give feedback" }).click();
  const form = page.getByRole("region", { name: "Interview feedback" });
  await expect(form.getByText(/No overall score/)).toBeVisible();
  await expect(form.getByRole("slider")).toHaveCount(0);
  await form.getByRole("button", { name: "Send feedback" }).click();
  await expect(form.getByRole("alert")).toHaveText("Answer every must-have (3 left).");
  await form.getByRole("radiogroup", { name: "Communication" }).getByRole("radio", { name: "Clearly shown" }).click();
  await form.getByRole("radiogroup", { name: "Event planning" }).getByRole("radio", { name: "Partly" }).click();
  await form.getByRole("radiogroup", { name: "MS Office" }).getByRole("radio", { name: "Not seen" }).click();
  await form.getByRole("radio", { name: /Move to offer/ }).click();
  await noSeriousA11y(page);
  await form.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("Interview completed")).toBeVisible();
  const fb = calls.find((c) => c.path === "/interviews/iv1/feedback")?.body as Record<string, string>;
  expect(fb.recommendation).toBe("advance");
  expect(fb.strengths).toContain("Clearly shown: Communication");
  expect(fb.strengths).toContain("Partly shown: Event planning");
  expect(fb.concerns).toContain("Not seen: MS Office");

  await page.getByRole("button", { name: "Not selected" }).first().click();
  await expect(page.getByRole("dialog", { name: "Mark Priya Sharma not selected" })).toBeVisible();
  expect(calls.some((c) => c.method === "PUT" && c.body && JSON.stringify(c.body).includes("rejected"))).toBe(false);
});

test("talent shows no match %; save to shortlist; company post validates then publishes", async ({ page }) => {
  const calls: Call[] = [];
  await setup(page, calls);
  await page.goto("/enterprise/talent");
  await expect(page.getByRole("link", { name: "Arjun Nair" })).toBeVisible();
  await expect(page.getByText(/\d+%/)).toHaveCount(0);
  await noSeriousA11y(page);
  await page.getByRole("button", { name: "Save Arjun Nair to shortlist" }).click();
  await expect(page.getByRole("button", { name: "Remove Arjun Nair from shortlist" })).toHaveAttribute("aria-pressed", "true");
  expect(calls.some((c) => c.path === "/enterprise/shortlist/c2/toggle")).toBe(true);

  await page.goto("/enterprise/posts");
  await expect(page.getByText("No company posts yet")).toBeVisible();
  await page.getByRole("button", { name: "New post" }).click();
  const sheet = page.getByRole("dialog", { name: "New company post" });
  await sheet.getByRole("button", { name: "Publish" }).click();
  await expect(sheet.getByText("Write something to post.")).toBeVisible();
  expect(calls.some((c) => c.method === "POST" && c.path === "/companies/me/posts")).toBe(false);
  await sheet.getByLabel("Post").fill("We're hiring two community associates.");
  await sheet.getByLabel(/Tags/).fill("#hiring, events");
  await noSeriousA11y(page);
  await sheet.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("listitem").getByText("We're hiring two community associates.")).toBeVisible();
  expect(calls.find((c) => c.method === "POST" && c.path === "/companies/me/posts")?.body).toEqual({ body: "We're hiring two community associates.", tags: ["hiring", "events"] });
});
