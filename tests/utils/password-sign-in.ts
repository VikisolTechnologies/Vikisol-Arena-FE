import type { Page } from "@playwright/test";

/** Sign-in opens on an email code. Password sign-in is one tap away, and every role
 * button resets the form back to the code. Call this after choosing a role and before
 * filling Email / Password. */
export async function revealPasswordSignIn(page: Page) {
  const acceptCookies = page.getByRole("button", { name: "Accept", exact: true });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }
  // Login card (Oct 2026): opens on the Mobile tab; password sign-in lives under the Email tab.
  const emailTab = page.getByRole("tab", { name: /Email/ });
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click();
  }
  const usePassword = page.getByRole("button", { name: "Use password instead" });
  if (await usePassword.isVisible().catch(() => false)) {
    await usePassword.click();
  }
}

/** The Email tab asks for the email first; Arena then emails a sign-in code and offers the
 * password as an alternative. Call after filling Email and before filling Password. */
export async function continueToPassword(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Use password instead" }).click();
}
