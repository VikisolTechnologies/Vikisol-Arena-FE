# Progress

**FE owner: Claude Code. Mission: `docs/missions/FE-BPLUS-BUILD.md`. Design is final
(`docs/design/*`). Cursor no longer touches FE except the separate P0 security release.**

Updated 28 Sep 2026. Resume from here.

## Current status

**Next step: P3 Discover & join** — Activity details (`/feed/[id]` for activities: hero with
shared layoutId from the card, host card, facts, Request to join), Join request sent (paper-plane
sheet + status timeline), Approved & ready (check draw + ≤24 confetti, meeting card, calendar/
reminder/share), Activity room (`/rooms/[id]`: Chat / Details / People), plus Discover's filter
chips from the Discover & join board (Today / Weekend / Free / Fitness / Learning / All filters).
Reuse the existing post/join/room calls; log gaps in `docs/FE-API-GAPS.md`. Then P4…P8.

Live preview: `npm run dev` for this worktree is Cursor's (port 3010); the founder preview runs
with `ARENA_NEXT_DIST_DIR=.next-founder npm run dev -- -H 0.0.0.0 -p 3001` →
http://localhost:3001/dev/progress (phone: http://<LAN IP>:3001/dev/progress). Board frames:
`node scripts/dev/cut-boards.mjs`; statuses in `src/lib/dev/screens.json`.

**P2 Core — done** (`49552e0`): B+ AppShell (Feed · Discover · (+) · Work · You), drag-to-dismiss
BottomSheet, Create sheet, Feed (Nearby default + honest fallback, pull to refresh), Discover
(+ map mode, drawn map when no Maps key), Work (Active/Upcoming/Completed + resolve/attendance
sheets), You, Jenny home (real conversation; status only from real replies). Old
`src/components/vnext/*` and the old /agent page components deleted. 24/24 local Playwright on a
production build; axe clean; no overflow 320–430. Unpushed if GitHub was unreachable — push first.

**P1 Entry & onboarding — built** (commit "FE B+ P1: entry and onboarding"):
- Screens: Welcome (`/`, `/auth`), Sign up / Sign in / 2FA code (`/auth?mode=`), Forgot and Reset
  password, onboarding `/onboarding?step=1..4` (Why are you here, Local life, Your identity,
  You're all set). M1A's UI (`src/components/vnext/entry/*`) and the old "Talent OS" landing
  components were deleted in the same commit; auth calls/session/redirect logic unchanged.
- P0-lite kit: `src/lib/motion.ts` (all timings), `MotionProvider` (LazyMotion + domMax async,
  MotionConfig reducedMotion="user"), `src/components/bplus/*` (Button, TextField/PasswordField/
  TextArea, Checkbox, SelectField, Chip, Toggle, StepperDots, Screen/TopBar/Title/Lede,
  PhotoPicker, Avatar, Burst), `src/lib/data/{mode,auth,profile,onboarding}.ts`, production build
  guard in `next.config.ts` (`NEXT_PUBLIC_ARENA_DATA` must be `api` on production).
- Checks: tsc + eslint clean; production build; Chromium + WebKit journeys pass; axe: 0 serious/
  critical on all 9 screens; no horizontal overflow at 320/360/375/390/430/1280; e2e sign-in
  selectors unchanged. Review: `docs/reviews/f523fcf.md` (screens in `docs/reviews/p1/`).
- API gaps for P1: `docs/FE-API-GAPS.md` rows 1–6.

**Next step:** deploy the protected preview (`vercel deploy` + alias `preview-arena.vikisol.in`),
then P2 Core: the B+ AppShell (bottom bar Feed · Discover · (+) · Work · You, header, Create
sheet), Feed, Discover (+ map mode), Work, You, Jenny home — replacing `src/components/vnext/*`.

**Before this branch ever reaches production:** set `NEXT_PUBLIC_ARENA_DATA=api` in the
production environment (the build refuses otherwise, by design).

## Deleted (28 Sep 2026 cleanup)

Root-level superseded plans/reports: `ARENA-DESIGN-SYSTEM.md`, `ARENA-FE-MISSION.md`,
`ARENA-FINAL-CUTOVER.md`, `ARENA-GO-LIVE-ON-DOMAIN.md`, `ARENA-MASTER-ARCHITECTURE.md`,
`ARENA-SHIP-IT.md`, `ARENA-V2-PRODUCT-ARCHITECTURE.md`, `AUDIT-REPORT.md`, `AUDIT.md`,
`BLOCKED.md`, `BLOCKERS.md`, `BUGS.md`, `COMPLETION-REPORT.md`, `DECISIONS.md`, `E2E-STATUS.md`,
`FUNC-BUGS.md`, `GAPS.md`, `GROUND-TRUTH.md`, `MOBILE-BUGS.md`, `MOBILE-PERF-BASELINE.md`,
`MOBILE-ROOT-CAUSE.md`, `PAGE-INVENTORY.md`, `PERF-BASELINE.md`, `PERF-REPORT.md`,
`PRODUCTION-CHECKLIST.md`, `PRODUCT_BIBLE.md`, `ROUTES.md`, `SAFETY-STATUS.md`,
`SECURITY-AUDIT.md`, `SHIP-REPORT.md`, `SLEEP-REPORT.md`, `STABILIZE-REPORT.md`, `STRUCTURE.md`,
`TESTING.md`, `UI-BUGS.md`. Credentials file: **`TEST-LOGINS.md`** (contained demo account
passwords — deleted, not just edited).

`docs/`: `ACCESS-NEEDED.md`, `ARENA-CURRENT-STATE.md`, `ARENA-FLOW-AND-MOBILE-REVIEW.md`,
`ARENA-VNEXT-BLUEPRINT.md`, `ARENA-VNEXT-REPORT.md`, `BLOCKERS.md`, `CURSOR-MONDAY-HANDOFF.md`,
`DECISIONS.md`, `SECURITY-FINDINGS.md`.

`docs/missions/CURSOR-M1.md` (superseded by FE-BPLUS-BUILD.md).

`docs/reviews/`: `24b488d.md`, `5e2d70c.md`, `998eefb.md`, `d746cf9.md`, `qa-vnext-2026-09-26.md`,
`m1a-visual-correction/REVIEW.md`.

Kept: `README.md` (rewritten), `CLAUDE.md`/`AGENTS.md` (authority order updated),
`docs/VIKISOL-MASTER-CONTEXT.md`, `docs/ARENA-MISSION.md` (M1–M8 line replaced),
`docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md` (trimmed to security/contract/automation/Gemini/
deployment only), `docs/PROGRESS.md` (this file), `docs/AGENT-COLLABORATION-PROTOCOL.md`,
`docs/missions/FE-BPLUS-BUILD.md`, `docs/design/*`, `docs/reviews/AUDIT-2026-09-26.md`,
`.github/workflows/e2e.yml`.

## History (kept short — see git log for detail)

- STEP 1–5 (Sep 2026): mobile shell v1, Feed/Create/Work/Discover/Map/Profile/Jenny slot
  components, VNext blueprint Gate 0, review fixes R1–R8. Superseded by the B+ boards.
- M1A (`d746cf9`, visual fix `1e8bf98`): rebuilt mobile auth + progressive onboarding — to the
  prior (now superseded) design. Reused/restyled in P1, not deleted outright, since the
  functional logic (auth calls, session handling) still applies.
- P0 security/honesty audit (`docs/reviews/AUDIT-2026-09-26.md`): two P0s open (shared demo
  passwords logged in prod, inflated public counts including seeded/real-brand demo data) — a
  **separate** Cursor-owned branch (`fix/p0-security-honesty`), not part of this mission.
- Backend contract tests (`ab6dcc6`): Jenny write-scope 403s are live and unchanged by anything
  above.

## Do not

- Merge PR #1.
- Deploy VNext to production, change DNS, or touch Arena BE / JennySol from this repo.
- Change Jenny's write JSON or auth/session logic.
- Use real brand names/logos, or fixture data outside preview mode.
- Touch Vikisol One.
