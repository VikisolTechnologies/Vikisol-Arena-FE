// ARENA-FIX-EVERYTHING.md Phase 0 - the /version API route (src/app/version/route.ts) already
// existed from an earlier pass, but nothing ever rendered it: there was no way to confirm what's
// actually live without curling the API by hand. This is the missing UI half - a corner stamp
// so a stale deploy is visible from a phone in 5 seconds, not a UX element. Server component
// (no "use client") since NEXT_PUBLIC_* is inlined at build time either way - ships zero JS.
// pointer-events-none is load-bearing: every shell (AppShell, Enterprise/HiringManager/
// CompanyAdmin/PlatformAdmin) fixes a bottom tab bar or side nav across the full viewport, so
// this must be provably unable to swallow a tap regardless of which shell is underneath it.
export function BuildStamp() {
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
  const short = commit === "unknown" || commit === "local" ? commit : commit.slice(0, 7);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0.5 right-1 z-[999] select-none font-mono text-[9px] leading-none tracking-tight text-foreground/25"
    >
      {short}
    </div>
  );
}
