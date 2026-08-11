import NotFound from "@/app/not-found";

/**
 * ARENA-INVENTORY-FIXES.md FIX 2 - the redirect target for "you're signed in, but this isn't
 * your role's surface" (a recruiter hitting a candidate-only page, etc.), reached from
 * lib/auth-guard.ts's requireOnboarded()/requireEnterpriseOnboarded() - plain .ts utility
 * functions that can't render JSX directly the way PlatformAdminShell renders <NotFound/>
 * in-place for its own wrong-role case. Reuses the exact same branded 404 rather than a
 * bespoke "access denied" page, matching PlatformAdminShell's own reasoning (DECISIONS.md/
 * PA7): don't give a wrong-role visitor a different-looking response that confirms a route is
 * real and gated - render the identical "this page isn't in my database" response either way.
 */
export default function AccessDeniedPage() {
  return <NotFound />;
}
