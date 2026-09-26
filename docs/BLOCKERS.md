# Blockers

## Sentry ingest 403

Production pages report a 403 from Sentry's ingest host. The app still loads. Fixing it means allowing `arena.vikisol.in` on the Sentry project, which needs the Sentry dashboard. `sentry-cli` is not installed here. The test monitor ignores that third-party 403 so a blocked error reporter does not hide a real Arena failure. Do not paste the DSN into chat or git.

## Initial JavaScript budget

The mission budget is 200KB gzipped of initial JS on `/home`. Production build of `feature/arena-vnext` (26 Sep 2026), scripts referenced by `.next/server/app/home.html`:

- 253KB gzipped in browsers that skip `<script nomodule>` (the legacy polyfill is 38KB and is not downloaded by current phones).
- 292KB gzipped if that legacy polyfill is counted too.

GSAP, the 3D scenes, the command palette, the create sheet, and the Jenny slot are separate chunks and are not in that first list. What remains is the Next.js client runtime (about 198KB gzipped) plus Sentry's client SDK (about 18KB, and production ingest still 403s) plus about 37KB of shell and feed code. Getting under 200KB means removing the App Router client runtime, which this app cannot do. The number stays visible. It is not a test that was deleted to pass.

## Workflow file

The GitHub token used from this machine cannot update `.github/workflows/e2e.yml`. See `docs/ACCESS-NEEDED.md`. The password comment in that workflow is unchanged.

## Jenny contract

The live gateway is in production. The write-body shapes are locked by `JennyArenaWriteBodyContractTest` on `feature/arena-jenny-contract`. The contract document is `jennysol-ai/docs/JENNY-ARENA-CONTRACT.md`. Arena must not change those endpoint shapes.
