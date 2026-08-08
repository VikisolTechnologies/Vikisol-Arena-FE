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
};

export default nextConfig;
