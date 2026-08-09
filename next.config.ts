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
  async redirects() {
    return [{ source: "/feed", destination: "/home", permanent: false }];
  },
};

export default nextConfig;
