// GOLIVE-PROXY.md F-PROXY — a tiny stand-in for arena-api, used only by playwright.proxy.config.ts
// to verify what src/middleware.ts's proxyApiRequest() actually sends upstream (the secret
// header, the resolved client IP, a streamed body) without needing the real Spring Boot
// backend running. Plain Node http, no deps, no TypeScript (this repo has no ts-node/tsx).
import http from "node:http";

const PORT = Number(process.env.PORT || 4091);
const SECRET = process.env.ARENA_PROXY_SECRET || "";

function send(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { "content-type": "application/json", ...extraHeaders });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = req.url || "";
    const secretSeen = req.headers["x-arena-proxy-secret"] ?? null;
    const clientIpSeen = req.headers["x-arena-client-ip"] ?? null;

    if (url === "/health") return send(res, 200, { status: "ok" });

    // Every real route below requires the secret, mirroring B-PROXY's trusted-proxy filter -
    // the point of this fixture is to prove the frontend proxy actually sends it, not to
    // re-implement the backend's own constant-time-compare logic.
    const authorized = SECRET === "" || secretSeen === SECRET;

    if (url === "/api/v1/_whoami") {
      // Not a real arena-api endpoint - a test-only introspection hook so the spec can assert
      // on exactly what header values reached "the backend", including a client-supplied
      // X-Arena-Client-Ip that the proxy should have discarded before this request was built.
      return send(res, 200, { secretSeen, clientIpSeen, authorized });
    }

    if (!authorized) return send(res, 403, { success: false, message: "bad or missing proxy secret" });

    if (url === "/api/v1/auth/signup" || url === "/api/v1/auth/refresh") {
      return send(res, 200, { success: true, data: { token: "fixture-jwt" } }, {
        "set-cookie": "arena_session=fixture-issued-session; Path=/; HttpOnly; SameSite=Lax",
      });
    }
    if (url === "/api/v1/auth/signout") {
      return send(res, 200, { success: true, data: null }, {
        "set-cookie": "arena_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
      });
    }
    if (url === "/api/v1/protected/needs-auth") {
      return send(res, 401, { success: false, message: "Unauthorized" });
    }
    if (url === "/api/v1/upload/echo") {
      return send(res, 200, { success: true, data: { bytes: body.length } });
    }
    return send(res, 404, { success: false, message: "no such fixture route" });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[upstream-fixture] listening on 127.0.0.1:${PORT}`);
});
