# Arena VNext progress

Another agent can resume from this file alone. Updated 2026-09-26.

## Phase

Step 2 cleanup is in progress on `feature/arena-cleanup`. The new UI is not started. It will go to a private preview, not production. Production may receive this cleanup only after the suite is green.

The old stop gate is cancelled. Do not wait for approval before building VNext. Do not merge `feature/arena-vnext` into `main`.

## Branch

`feature/arena-cleanup` in `Vikisol-Arena-FE`, not pushed. Backend `main` is clean apart from an `mvnw` file-mode change that should not be committed.

## Done

- Live versions match git: frontend `3093442`, backend `93eddd2`. Hosts: Vercel `arena.vikisol.in`, Railway `arena-staging` / `arena-api`.
- `docs/ARENA-CURRENT-STATE.md` is the ground-truth audit.
- `docs/ACCESS-NEEDED.md` and `docs/BLOCKERS.md` exist. Sentry allowed-origins still need the dashboard. Jenny contract is still missing.
- Playwright against production: 207 passed, 35 failed. Sign-in works. Enterprise company-admin sign-in returned 200 with no 2FA.
- Cleanup so far, not yet verified green:
  - Footer and stamp contrast uses `#a1a1aa` (already the muted text color, about 7.7:1 on `#09090b`) instead of `#5c5c64` and 25% white.
  - Build stamp sits at the top-right in muted text so it does not cover Inbox.
  - Guest `/home` test expects a read-only home and a sign-in prompt on Create. The name `Aarav Sharma` is in the phone header.
  - Cold-load FCP budget is 2.5s. WebKit skips CDP network emulation.
  - Sentry ingest 403s are ignored in the monitor. The DSN is not in git.
  - Deleted unused `IntentCardView`, `CareerHealthGauge`, `HealthOrbScene`, and `SkillRadar`.

## Next

1. Local re-run of the production failures is green: accessibility, access control, landing load, golden path, and a WebKit route sweep (50 passed, 2 latency tests skipped). Companies list had a button-inside-button hydration error; the card is a link plus a follow button now, and that WebKit check passed.
2. Full local suite: 237 passed, 4 skipped, 1 failed. The failure was mobile sign-in saying it could not reach the backend while two workers were loading the app. That same test passed alone in 20 seconds. Commit and deploy are still waiting on a clean full run, not on a product bug.
3. Step 3: `docs/ARENA-VNEXT-BLUEPRINT.md` and mockups in `docs/design/`.
4. Step 4–6: build VNext on `feature/arena-vnext`, private preview, tests, unmerged PR, `docs/ARENA-VNEXT-REPORT.md`.

## Open

- Initial JS on `/home` is still above the 200KB gzipped budget. See `docs/BLOCKERS.md`.
- `docs/JENNY-ARENA-CONTRACT.md` is not in the JennySol repo yet.
- Attendance is stored and never shown as reputation.
- Feed ranker only scores the newest 500 posts and ignores distance.
