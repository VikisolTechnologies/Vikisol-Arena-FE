# Blockers

## Sentry

The previous ingest 403 came from a DSN whose project no longer exists. Arena web and Arena API now use new Sentry projects. The DSNs live only in Vercel and Railway environment variables. `sendDefaultPii` is false, Session Replay is not registered, and `beforeSend` strips cookies, auth headers, and request bodies. The test monitor no longer ignores a Sentry ingest response.

## Initial JavaScript budget

The mission budget is 200KB gzipped of initial JS on `/home`. An earlier measurement put the shared floor near 300KB because GSAP and the app shell load on every route. First contentful paint on a throttled phone was 1.9–2.2s, inside the 2.5s budget. The 200KB script budget is not met yet. Cutting it means splitting the root shell further, not hiding the number.

## Jenny contract verification

`jennysol-ai/docs/JENNY-ARENA-CONTRACT.md` now exists. This is no longer an access blocker. Arena
must add producer/consumer contract coverage for every endpoint it consumes before expanding Jenny
slots or changing any shared request/response shape.
