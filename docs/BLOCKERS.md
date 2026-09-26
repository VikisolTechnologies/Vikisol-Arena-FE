# Blockers

## Sentry ingest 403

Production pages report a 403 from Sentry's ingest host. The app still loads. Fixing it means allowing `arena.vikisol.in` on the Sentry project, which needs the Sentry dashboard. `sentry-cli` is not installed here. The test monitor ignores that third-party 403 so a blocked error reporter does not hide a real Arena failure. Do not paste the DSN into chat or git.

## Initial JavaScript budget

The mission budget is 200KB gzipped of initial JS on `/home`. An earlier measurement put the shared floor near 300KB because GSAP and the app shell load on every route. First contentful paint on a throttled phone was 1.9–2.2s, inside the 2.5s budget. The 200KB script budget is not met yet. Cutting it means splitting the root shell further, not hiding the number.

## Jenny contract

`jennysol-ai/docs/JENNY-ARENA-CONTRACT.md` does not exist. Jenny slots stay empty until it does.
