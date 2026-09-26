# Blockers

## Sentry ingest 403

Production pages report a 403 from Sentry's ingest host. The app still loads. Fixing it means allowing `arena.vikisol.in` on the Sentry project, which needs the Sentry dashboard. `sentry-cli` is not installed here. The test monitor ignores that third-party 403 so a blocked error reporter does not hide a real Arena failure. Do not paste the DSN into chat or git.

## Initial JavaScript budget

Met on `30a08a5`. Production build of `/home` with a DSN set, scripts in `.next/server/app/home.html`, 26 Sep 2026:

- 181.4KB gzipped in browsers that skip `<script noModule>`.
- 219.9KB gzipped if the 38.5KB legacy polyfill is counted too.

Sentry's client SDK and the command palette load after idle, so they are not in that first list. GSAP, maps, and the 3D scenes were already separate chunks. The 200KB assertion was not changed.

## Workflow file

The GitHub token used from this machine cannot update `.github/workflows/e2e.yml`. See `docs/ACCESS-NEEDED.md`. The password comment in that workflow is unchanged.

## Jenny contract

The live gateway is in production. The write-body shapes are locked by `JennyArenaWriteBodyContractTest` on `feature/arena-jenny-contract`. The contract document is `jennysol-ai/docs/JENNY-ARENA-CONTRACT.md`. Arena must not change those endpoint shapes.
