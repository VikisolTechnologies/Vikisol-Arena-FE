import { test, expect } from "@playwright/test";

// GOLIVE-PROXY.md F-PROXY §4's checklist, each item its own test:
// sign-up/refresh/sign-out through the proxy; a 9 MB upload; a 401 passing through; the secret
// header present upstream and absent from what the browser gets back; a client-supplied
// X-Arena-Client-Ip being ignored. All against tests/proxy/fixtures/upstream-server.mjs, not the
// real backend - this suite is about the proxy's own behavior (headers, streaming, pass-through),
// which doesn't need a real arena-api to verify.

test("sign-up through the proxy reaches upstream and relays its Set-Cookie", async ({ request }) => {
  const res = await request.post("/api/v1/auth/signup", { data: { email: "a@b.com" } });
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.success).toBe(true);
  expect(json.data.token).toBe("fixture-jwt");
  const setCookie = res.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain("arena_session=fixture-issued-session");
});

test("refresh through the proxy reaches upstream and relays its Set-Cookie", async ({ request }) => {
  const res = await request.post("/api/v1/auth/refresh");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.data.token).toBe("fixture-jwt");
  expect(res.headers()["set-cookie"] ?? "").toContain("arena_session=fixture-issued-session");
});

test("sign-out through the proxy relays the cookie-clearing Set-Cookie", async ({ request }) => {
  const res = await request.post("/api/v1/auth/signout");
  expect(res.status()).toBe(200);
  expect(res.headers()["set-cookie"] ?? "").toContain("Max-Age=0");
});

test("a 401 from upstream passes through the proxy untouched", async ({ request }) => {
  const res = await request.get("/api/v1/protected/needs-auth");
  expect(res.status()).toBe(401);
  const json = await res.json();
  expect(json.success).toBe(false);
});

test("the proxy secret reaches upstream but is never reflected back to the caller", async ({ request }) => {
  const res = await request.get("/api/v1/_whoami");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.authorized).toBe(true);
  expect(json.secretSeen).toBe("f-proxy-test-secret-do-not-use-in-prod");
  // Nothing in the response the "browser" got back carries the secret value anywhere.
  const headerDump = JSON.stringify(res.headers());
  expect(headerDump).not.toContain("f-proxy-test-secret-do-not-use-in-prod");
});

test("a client-supplied X-Arena-Client-Ip is discarded, not forwarded upstream", async ({ request }) => {
  const res = await request.get("/api/v1/_whoami", {
    headers: { "X-Arena-Client-Ip": "203.0.113.66" },
  });
  const json = await res.json();
  // The proxy strips every inbound X-Arena-* header before setting its own from Vercel's own
  // edge-assigned IP headers (x-real-ip / x-vercel-forwarded-for) - absent in this local test
  // request, so upstream should see no client-IP header at all, and specifically never the
  // spoofed value the caller tried to inject.
  expect(json.clientIpSeen).not.toBe("203.0.113.66");
});

test("a 9 MB body streams through the proxy intact", async ({ request }) => {
  const nineMb = Buffer.alloc(9 * 1024 * 1024, 7);
  const res = await request.post("/api/v1/upload/echo", {
    data: nineMb,
    headers: { "content-type": "application/octet-stream" },
  });
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.data.bytes).toBe(nineMb.length);
});
