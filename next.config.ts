import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker runtime image - bundles only the traced production
  // dependencies into .next/standalone instead of shipping the full node_modules tree.
  output: "standalone",
  // ARENA-DEEP-AUDIT.md Phase 5: this used to unconditionally set X-Robots-Tag: noindex,
  // nofollow here, which meant the header shipped on the live production domain too (found by
  // curl-checking prod response headers directly) - Google was never going to index the site
  // since noindex was never removed when the domain cutover to arena.vikisol.in happened. The
  // noindex/nofollow header now lives in middleware.ts, gated behind the same
  // STAGING_BASIC_AUTH check as the access gate itself, so it only ever applies to an actual
  // staging deploy that opts in - never to production, regardless of build vs. runtime env
  // var timing.
  async headers() {
    // arena-api (Spring Security) already sends CSP/HSTS/nosniff/frame-options/referrer-policy
    // by default - checked via curl against the live API. This app (self-hosted on Railway via
    // its own Docker image, not a platform like Vercel that injects sane defaults) was sending
    // none of them at all. Deliberately NOT adding Content-Security-Policy here yet - getting
    // one right requires enumerating every legitimate script/connect/style origin this app uses
    // (Sentry ingest, api-arena.vikisol.in, GSAP, the R3F/WebGL scenes) and testing every page
    // against it, and a wrong CSP could silently break the 3D scenes this project's ground
    // rules require staying intact. Tracked as a follow-up in SECURITY-AUDIT.md rather than
    // shipped un-tested here.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  // ARENA-MASTER-ARCHITECTURE.md PART 2/15 - /home replaces /feed as the default landing.
  // Only the exact list route redirects; /feed/[id] (post detail) keeps working as-is until
  // Step 5 migrates it to /p/[postId] - not bundling an unrelated route rename into this one.
  //
  // ARENA-INVENTORY-FIXES.md FIX 2 - /dashboard's own page.tsx is deleted (ROUTES.md has called
  // it fully retired since the Phase A nav reposition); this catches any stray bookmark/external
  // link instead of letting it 404. /dashboard was always the candidate-specific predecessor to
  // /home (see CandidateAppShell's own PART 2/15 comment), never a shared multi-role landing, so
  // redirecting everyone there is directionally correct - a wrong-role visitor gets /home's own
  // (now-fixed, see auth-guard.ts) access-denied handling instead of a second hop.
  // ARENA-INVENTORY-FIXES.md FIX 3 - /interviews and /enterprise/interviews (the bare list
  // routes) 404 - only their [applicationId] detail sub-route was ever built. No nav item or
  // in-app link points at either bare path (grepped), and - unlike the audit's original
  // finding - the detail route ISN'T actually orphaned: /applications' "Schedule" flow does
  // reach it, via a confirm-slot dialog -> "Go to interview room" button, not a direct link
  // (why the earlier click-test missed it). Building a real aggregate list needs a backend
  // endpoint neither role has today (InterviewController has no candidate-facing or
  // recruiter/company_admin-facing list, only HM's own /interviews/mine) - real, scoped
  // follow-up work, not something to improvise in a bug-fix pass. Redirecting to where each
  // role already sees interview-stage info today satisfies "no route may 404" without that.
  // See DECISIONS.md.
  async redirects() {
    return [
      { source: "/feed", destination: "/home", permanent: false },
      { source: "/dashboard", destination: "/home", permanent: false },
      { source: "/interviews", destination: "/applications", permanent: false },
      { source: "/enterprise/interviews", destination: "/enterprise/postings", permanent: false },
    ];
  },
};

export default nextConfig;
