import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker runtime image - bundles only the traced production
  // dependencies into .next/standalone instead of shipping the full node_modules tree.
  output: "standalone",
  async headers() {
    return [
      {
        // ARENA-SHIP-IT.md #8: "keep staging PRIVATE - add noindex." Applies regardless of
        // STAGING_PRIVATE (the middleware.ts basic-auth gate) so this is never accidentally
        // left off if that env var is ever unset - a search engine finding an unlisted staging
        // URL is a mistake either way, not just while the access gate happens to be on.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
