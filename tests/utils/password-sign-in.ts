import type { Page } from "@playwright/test";

/** Sign-in opens on an email code. Password sign-in is one tap away, and every role
 * button resets the form back to the code. Call this after choosing a role and before
 * filling Email / Password. */
export async function revealPasswordSignIn(page: Page) {
  const acceptCookies = page.getByRole("button", { name: "Accept", exact: true });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }
  const usePassword = page.getByRole("button", { name: "Use password instead" });
  if (await usePassword.isVisible().catch(() => false)) {
    await usePassword.click();
  }
}
