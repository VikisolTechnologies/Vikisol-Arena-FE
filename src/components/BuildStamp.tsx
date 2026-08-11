// ARENA-STABILIZE.md Phase 0.2 - staleness must be visible in 5 seconds. Baked at Docker build
// time from Railway's RAILWAY_GIT_COMMIT_SHA (see Dockerfile), not read at runtime, since
// NEXT_PUBLIC_* vars are inlined into the client bundle at build time. "unknown" only happens
// on a local `next build` outside Railway, where that build arg is never set.
const COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
const BUILT_AT = process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown";

export function BuildStamp() {
  return (
    <div
      className="pointer-events-none fixed bottom-1 right-2 z-40 select-none font-mono text-[10px] leading-none text-ink-300"
      aria-hidden="true"
    >
      {COMMIT.slice(0, 7)} · {BUILT_AT}
    </div>
  );
}
