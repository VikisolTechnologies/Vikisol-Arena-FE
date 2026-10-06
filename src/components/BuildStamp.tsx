// ARENA-FIX-EVERYTHING.md Phase 0 - the /version API route (src/app/version/route.ts) already
// existed from an earlier pass, but nothing ever rendered it: there was no way to confirm what's
// actually live without curling the API by hand. This is the missing UI half - a corner stamp
// so a stale deploy is visible from a phone in 5 seconds, not a UX element. Server component
// (no "use client") since NEXT_PUBLIC_* is inlined at build time either way - ships zero JS.
// pointer-events-none is load-bearing: every shell (AppShell, Enterprise/HiringManager/
// CompanyAdmin/PlatformAdmin) fixes a bottom tab bar or side nav across the full viewport, so
// this must be provably unable to swallow a tap regardless of which shell is underneath it.
/** Version stays on `/version`. A missing commit used to render the word "unknown" over the product. */
export function BuildStamp() {
  return null;
}
