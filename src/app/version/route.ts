// ARENA-STABILIZE.md Phase 0.2 - a public, phone-checkable "is this actually the latest code"
// endpoint. Values are baked in at Docker build time (see Dockerfile / BuildStamp.tsx), not
// computed here, since Next.js standalone output has no access to the git working tree at
// runtime.
export async function GET() {
  return Response.json({
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
  });
}
