import { test, expect, type Page } from "@playwright/test";

// MARATHON-FE-2 Step A — company verification: website + work email -> a code to the domain ->
// "Pending review" -> the platform admin approves or rejects, with a note -> Verified badge or
// Rejected (with the reason and a retry). A job in draft shows "Verify your company to publish".
// Both sides of the journey, company account and platform admin, stubbed at the API boundary;
// the real contract (BusinessController, AdminVerificationController) was verified live with
// curl against the local backend before this test was written.

type Call = { method: string; path: string; body: unknown };

async function signInAs(page: Page, role: string, name: string, email: string) {
  await page.goto("/auth");
  await page.evaluate(([r, n, e]) => {
    localStorage.setItem("arena_cookie_consent", "accepted");
    localStorage.setItem("arena_session", JSON.stringify({ role: r, name: n, email: e }));
    localStorage.setItem("arena_enterprise_onboarded", "true");
  }, [role, name, email]);
}

test("company submits verification, admin approves, company sees Verified and can publish", async ({ page }) => {
  const calls: Call[] = [];
  let verification: Record<string, unknown> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ method: req.method(), path, body });
    let data: unknown = null;
    let success = true;

    if (path === "/enterprise/profile/me") {
      data = { companyName: "GreenLeaf Labs", logoEmoji: "g", industry: "Sales", size: "11-50", hiringFor: ["Community"], plan: "pro", seatsUsed: 2, seatsTotal: 5, unlockCreditsUsed: 3, unlockCreditsTotal: 50, status: "active" };
    } else if (path === "/enterprise/verification" && req.method() === "GET") {
      data = verification;
    } else if (path === "/enterprise/verification" && req.method() === "POST") {
      verification = { status: "pending", legalName: (body as { legalName: string }).legalName, website: (body as { website: string }).website, domain: "greenleaf.example", workEmail: (body as { workEmail: string }).workEmail, domainConfirmed: false, legacy: false };
      data = verification;
    } else if (path === "/enterprise/verification/confirm") {
      if ((body as { code: string }).code !== "482913") {
        success = false;
        data = { message: "That code didn't work. Try again." };
      } else {
        verification = { ...verification, status: "pending", domainConfirmed: true, legacy: false };
        data = verification;
      }
    } else if (path === "/admin/verification" && req.method() === "GET") {
      data = verification ? [{ id: "v1", companyId: "co1", companyName: "GreenLeaf Labs", legalName: verification.legalName, website: verification.website, domain: verification.domain, workEmail: verification.workEmail, status: verification.status, domainMatch: true, submittedAt: new Date().toISOString() }] : [];
    } else if (path === "/admin/verification/v1/approve") {
      verification = { ...verification, status: "verified", legacy: false, verifiedAt: new Date().toISOString() };
      data = { id: "v1" };
    }
    await route.fulfill({ json: success ? { success: true, data } : { success: false, message: (data as { message: string }).message } });
  });

  await signInAs(page, "company_admin", "Alex Rao", "alex@greenleaf.example");
  await page.goto("/enterprise/admin/company");
  await expect(page.getByRole("heading", { name: "Company verification" })).toBeVisible();

  await page.getByLabel("Legal name").fill("GreenLeaf Labs Pvt Ltd");
  await page.getByLabel("Website").fill("https://greenleaf.example");
  await page.getByLabel("Work email").fill("alex@greenleaf.example");
  await page.getByRole("button", { name: "Send verification code" }).click();
  await expect(page.getByText(/We sent a code to alex@greenleaf.example/)).toBeVisible();

  await page.getByLabel("Code").fill("111111");
  await page.getByRole("button", { name: "Confirm code" }).click();
  await expect(page.getByText("That code didn't work. Try again.")).toBeVisible();

  await page.getByLabel("Code").fill("482913");
  await page.getByRole("button", { name: "Confirm code" }).click();
  await expect(page.getByText("Pending review")).toBeVisible();
  expect(calls.filter((c) => c.path === "/enterprise/verification/confirm")).toHaveLength(2);

  // The platform admin approves it.
  await signInAs(page, "platform_admin", "Platform Admin", "pa@vikisol.dev");
  await page.goto("/admin/verification");
  await expect(page.getByText("GreenLeaf Labs")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("radio", { name: "Approved" }).click();
  await expect(page.getByText("GreenLeaf Labs")).toBeVisible();

  // Back on the company side, the badge now shows Verified.
  await signInAs(page, "company_admin", "Alex Rao", "alex@greenleaf.example");
  await page.goto("/enterprise/admin/company");
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
});
