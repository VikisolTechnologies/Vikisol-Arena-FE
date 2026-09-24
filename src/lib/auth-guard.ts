import type { useRouter } from "next/navigation";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";

type Router = ReturnType<typeof useRouter>;

/** Shared auth-guard checks (ARENA-DEEP-AUDIT.md Phase 3) - consolidates the
 * `if (!getSession()) {...}; if (!isOnboarded()) {...}` pair reimplemented at the top of the
 * data-loading effect on ~26 pages. Call as the first line of that same effect and bail
 * (`return`) when it returns false - preserves the existing "redirect blocks the fetch calls
 * that follow" behavior exactly, just without every page re-deriving the redirect targets. */
export function requireSession(router: Router): boolean {
  if (!getSession()) {
    router.replace("/auth");
    return false;
  }
  return true;
}

// ARENA-INVENTORY-FIXES.md FIX 2 - a session that exists but is the WRONG role (a recruiter
// hitting a candidate-only page, a talent/platform_admin session hitting an enterprise page,
// etc.) must never land in an onboarding wizard that isn't theirs - that was the actual bug the
// live audit found (traced through /dashboard, itself a route ROUTES.md calls fully retired).
// Routes to /access-denied, a real route that renders the same branded 404 PlatformAdminShell
// already renders directly for its own wrong-role case - reached via navigation here since
// these are plain functions, not components, so they can't render JSX in place.
function denyWrongRole(router: Router): void {
  router.replace("/access-denied");
}

// Onboarding is no longer a hard gate (founder's call) - a brand-new signup already gets a
// real, valid default CandidateProfile server-side (AuthService.signUp ->
// seedDataFactory.blankCandidateProfile), so nothing downstream actually depends on the wizard
// having run first. /onboarding is still a real, reachable page (linked from a "complete your
// profile" prompt), just no longer mandatory before using the rest of the app. isOnboarded()
// itself is kept (still set at signup/sign-in - see redirectForRole) purely as a UI hint for
// that prompt, not as an access check.
export function requireOnboarded(router: Router): boolean {
  if (!requireSession(router)) return false;
  const session = getSession();
  if (session && session.role !== "talent") {
    denyWrongRole(router);
    return false;
  }
  return true;
}

export function requireEnterpriseOnboarded(router: Router): boolean {
  if (!requireSession(router)) return false;
  const session = getSession();
  if (session && session.role !== "recruiter" && session.role !== "company_admin") {
    denyWrongRole(router);
    return false;
  }
  if (!isEnterpriseOnboarded()) {
    router.replace("/enterprise/onboarding");
    return false;
  }
  return true;
}
