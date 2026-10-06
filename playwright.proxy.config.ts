import { defineConfig } from "@playwright/test";

// GOLIVE-PROXY.md F-PROXY — verifies src/middleware.ts's proxyApiRequest() against a local
// stand-in upstream (tests/proxy/fixtures/upstream-server.mjs), not the real arena-api: sign-up/
// refresh/sign-out through the proxy, a 9 MB upload streamed through it, a 401 passing through
// untouched, the secret header reaching upstream but never reflected back to the browser, and a
// client-supplied X-Arena-Client-Ip being discarded rather than forwarded. Hits the Next app's
// own /api/v1/* routes directly via Playwright's request context - no page/browser needed, since
// this is testing the proxy layer, not any UI.
const UPSTREAM_PORT = 4091;
const PROXY_SECRET = "f-proxy-test-secret-do-not-use-in-prod";

export default defineConfig({
  testDir: "./tests/proxy",
  testMatch: "**/*.proxy.ts",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3108" },
  webServer: [
    {
      command: `node tests/proxy/fixtures/upstream-server.mjs`,
      url: `http://127.0.0.1:${UPSTREAM_PORT}/health`,
      timeout: 30_000,
      reuseExistingServer: false,
      env: { PORT: String(UPSTREAM_PORT), ARENA_PROXY_SECRET: PROXY_SECRET },
    },
    {
      command: "npx next build && npx next start -p 3108",
      url: "http://localhost:3108/api/health",
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        ARENA_NEXT_DIST_DIR: ".next-proxy-tests",
        NEXT_PUBLIC_ARENA_DATA: "api",
        // Relative - the production shape (GOLIVE-PROXY.md's whole point). The middleware
        // rewrite is what actually resolves it to the upstream fixture below.
        NEXT_PUBLIC_API_BASE_URL: "/api/v1",
        ARENA_API_ORIGIN: `http://127.0.0.1:${UPSTREAM_PORT}`,
        ARENA_PROXY_SECRET: PROXY_SECRET,
        NEXT_PUBLIC_SENTRY_DSN: "",
        SENTRY_DSN: "",
        STAGING_BASIC_AUTH: "",
      },
    },
  ],
});
