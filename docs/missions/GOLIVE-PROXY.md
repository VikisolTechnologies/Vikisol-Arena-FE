# GOLIVE-PROXY: how arena.vikisol.in reaches the home server (decided 5 Oct 2026)
**From the architect. This is the founder's decision.**
- Cloudflare is used **only for the tunnel**.
- The DNS for `vikisol.in` **stays at GoDaddy and is not moved**. That zone carries Microsoft 365 email with DMARC `p=reject`, HRLMS production and JennySol; nobody touches those records.

## The design
```
phone/browser ──► https://arena.vikisol.in            (Vercel, unchanged DNS)
                    │  same-origin calls to /api/v1/*
                    ▼
              Vercel proxy (this repo)  ── adds a secret header ──►
              https://api.<new-domain>   (Cloudflare Tunnel, new small domain on Cloudflare DNS)
                    ▼
              arena-api on the home server (Docker)
```
- People only ever see `arena.vikisol.in`.
- All API calls are **same-origin** (`/api/v1/...`), so the auth cookies are first-party and work on iPhone Safari, and no CORS is needed for the app.
- The only DNS record that ever changes at GoDaddy is **none**. The old `api-arena` CNAME → Railway simply becomes unused, and the founder deletes it when Railway is switched off.

## Frontend work (mission F-PROXY; do it after MARATHON-FE-2 Step D)
1. **Base URL:** in production, `NEXT_PUBLIC_API_BASE_URL=/api/v1` (relative). Check every place that builds absolute URLs from it:
   - `apiHealth.ts`;
   - `companyAdmin.ts`'s `API_BASE_URL` export;
   - server-side code such as `serverSession`;
   - any `new URL(API_BASE_URL)`.

   Server-side code (middleware, route handlers, server components) must call the upstream directly using the server-only `ARENA_API_ORIGIN`, not the relative path.
2. **Proxy:** replace the dev-only `src/app/api/v1/[...path]/route.ts` (it buffers the whole body, and it's inert without `ARENA_DEV_PROXY`) with a production proxy:
   - **Prefer a rewrite done in `src/middleware.ts`** (`NextResponse.rewrite(new URL(path, ARENA_API_ORIGIN), { request: { headers } })`), so bodies **stream** and aren't limited by the 4.5 MB function body cap. Fall back to a streaming route handler (`duplex: "half"`) only if the middleware rewrite can't set the header.
   - Add the request header `X-Arena-Proxy-Secret: <ARENA_PROXY_SECRET>` (server env; never `NEXT_PUBLIC`).
   - Forward the real client IP as `X-Arena-Client-Ip`, taken from Vercel's `x-real-ip` or `x-vercel-forwarded-for`. **Strip any client-supplied `X-Arena-*` headers first.**
   - Pass `Set-Cookie`, the status and streaming through untouched. Don't cache (`Cache-Control: no-store` on API responses).
   - The middleware `matcher` must include `/api/v1/:path*`. The existing staging gate and the `/auth` redirect must keep working.
3. **Cookies:** confirm that `arena_session` and the refresh cookie (path `/api/v1/auth`) are set **without a `Domain` attribute**, so they become host-only on `arena.vikisol.in`. Confirm the frontend middleware still reads `arena_session`.
4. **Tests (against a local upstream):**
   - sign-up, refresh and sign-out through the proxy;
   - a **9 MB** resume upload and a photo upload through the proxy (the backend limit is 10 MB);
   - a 401 passes through;
   - the secret header is present upstream and absent from anything sent to the browser;
   - a client-supplied `X-Arena-Client-Ip` is ignored.
5. **Vercel env (the founder sets these at go-live):** `NEXT_PUBLIC_ARENA_DATA=api`, `NEXT_PUBLIC_API_BASE_URL=/api/v1`, `ARENA_API_ORIGIN=https://api.<new-domain>`, `ARENA_PROXY_SECRET=<the same value as on the server>`. Update `RELEASE-CHECKLIST.md`.
6. **Report honestly:**
   - anything that can't go through a Vercel proxy (WebSockets and long-lived SSE; none found by grep today, but confirm);
   - the Vercel plan limits that matter (Hobby is non-commercial; bandwidth).

## Backend work (mission B-PROXY)
1. **Trusted proxy:** a filter that runs before rate limiting.
   - When `ARENA_PROXY_SECRET` is configured, a request is accepted **only if** `X-Arena-Proxy-Secret` matches (constant-time compare); otherwise 403.
   - Exceptions: `/actuator/health` (monitoring) and, in the `local` profile, everything.
   - When accepted, the client IP for `RateLimitFilter` and the audit log comes from `X-Arena-Client-Ip` (validated as an IP), **not** from `getRemoteAddr()`. `X-Forwarded-For` from the tunnel is ignored for identity.
   - Tests:
     - a missing or wrong secret → 403;
     - a spoofed client-IP header without the secret → ignored and refused;
     - two different client IPs get separate rate-limit buckets.
2. **Cookies:**
   - make the cookie `Domain` unset by default;
   - `SameSite=Lax` and `Secure=true` in production (same-origin now, so `None` isn't needed);
   - keep these env-configurable;
   - update `DEPLOY-CHECKLIST.md`.
3. **CORS:** keep the allow-list minimal: no browser origin needs it in production any more. Keep localhost for the `local` profile.
4. **`DEPLOY-CHECKLIST.md`:** add `ARENA_PROXY_SECRET` (name only), the cookie settings, and "the tunnel hostname is never given to users".

## Server builder (addendum to INFRA-1)
- Step 4 changes. The public hostname is `api.<new-domain>` on a **new small domain whose DNS is on Cloudflare** (the founder buys it and adds it to Cloudflare; any registrar is fine). **`vikisol.in` is never added to Cloudflare.** Until the domain exists, keep testing on the temporary `trycloudflare.com` quick tunnel.
- Generate `ARENA_PROXY_SECRET` into the server secrets file without displaying it, and tell the founder how to copy it into Vercel himself (open the file locally and paste it into Vercel; never into a chat).
- The external uptime check uses `https://api.<new-domain>/api/v1/actuator/health` (allowed without the secret).

## Go-live order (the architect says "go live" only when all of these are true)
1. The frontend is release-ready (MARATHON-FE-2 + F-PROXY), the backend is release-ready (B-PROXY), and the architect has reviewed them.
2. The server passes INFRA-1 (the reboot test and the backup restore test) on the quick tunnel.
3. The founder buys the new domain and adds it to Cloudflare; the tunnel hostname goes live; health is UP from outside.
4. The founder merges the backend PRs to `main`; the server deploys (`infra/deploy.sh`) on a clean database; the platform admin is bootstrapped.
5. The founder merges the frontend PR and sets the four Vercel variables. Vercel deploys `arena.vikisol.in`.
6. Smoke test on a real phone: sign-up, activity, need, resume upload, company verify, admin.
7. Railway `arena-api` is stopped **after** 48 hours of stable running. HRLMS and JennySol on Railway are untouched.
