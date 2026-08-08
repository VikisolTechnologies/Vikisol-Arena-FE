import type { useRouter } from "next/navigation";
import { getSession, isOnboarded, isEnterpriseOnboarded } from "@/lib/session";

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

export function requireOnboarded(router: Router): boolean {
  if (!requireSession(router)) return false;
  if (!isOnboarded()) {
    router.replace("/onboarding");
    return false;
  }
  return true;
}

export function requireEnterpriseOnboarded(router: Router): boolean {
  if (!requireSession(router)) return false;
  if (!isEnterpriseOnboarded()) {
    router.replace("/enterprise/onboarding");
    return false;
  }
  return true;
}
