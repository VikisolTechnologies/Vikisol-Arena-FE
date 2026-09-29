# Progress

**FE owner: Claude Code. Mission: `docs/missions/FE-BPLUS-BUILD.md`. Design is final
(`docs/design/*`). Cursor no longer touches FE except the separate P0 security release.**

Updated 29 Sep 2026. Resume from here.

## Architect review 29 Sep — status (branch `local/wip-2026-09-29`)

Work branch is now `local/wip-2026-09-29` (in worktree `arena-fe-vnext`; it contains everything
from `feature/arena-vnext-mobile-jenny` plus the review work). GitHub was unreachable from this Mac
all day; a background loop pushes the WIP branches (never main) when it comes back.

- **Section A — done** (commit "FE review A"): one preview world, matched photos, avatars, quiet
  preview bar, solid icon badges, light paper pages, business bottom bar + /enterprise/candidates,
  Arena for Business titles, redrawn skyline, two-line meta + "N offers", speed (prod ≤1.1 s).
- **Section B — done** (commit "FE review B").
- **F2 — in progress**: done: Search, Discover activity filters, Map basemap, Candidates standalone,
  See the outcome, Activity room (photo header + Host tools · Report · Leave), Welcome (photo
  accepted), Offer details (full page), Job details (tabs + lists), Work → Jobs, Career profile tabs.
  Remaining: Jenny orb (P8).
- Tracker: statuses are Built / In progress / Not started; only the architect sets Approved.


**Fidelity pass — done 29 Sep** (commit "FE fidelity pass"): see `docs/reviews/fidelity-pass.md`.
After the follow-up commit (recruiter panels on cream): 36 board screens Done, 13 In progress,
each with a note on /dev/progress. Remaining ones (Map tiles, Discover filter, Activity room header,
Offer details page, See outcome, Search results, Career profile tabs, Work→Jobs, Job details, Jenny
orb, Welcome photo, Candidates standalone) can be closed alongside P8/P11. Preview helpers:
`/dev/person?to=<path>` (signed-in neighbour) and `/dev/business?to=<path>` (recruiter).

**Next step: P8 Jenny boards + Jenny pre-fill (flow §10)**, then P10 Arena Admin (§9), then P11.
P8: read `docs/design/boards/jenny-layer.png` + `jenny-automation.png` (screens.json phases "P8
Jenny — …"), write "Think (P8)" in BPLUS-SCREENS.md, then build: Jenny noticed (feed), Discover
intent → filters, Tell Jenny → pre-filled intake ("Or just tell Jenny" on every IntakeForm, fields
glow via `jennyFilled`), approve action, set automation, Jenny today/work. Jenny never publishes,
applies or sends on her own. Reuse `src/lib/api/agent.ts` (real mode only) and the existing
JennyActionCard; missing agent endpoints → FE-API-GAPS #36+. Jenny's autonomy is "prepares, you
approve" only — no Autopilot/Auto-apply (fidelity pass). Screenshot every P8 screen via
`/dev/person?to=` next to its board before marking it Done.

**P7 → P9 Arena for Business — done** (29 Sep, commits "FE P7/P9 (1/n)"…"(5/n)"): B+ business
frame, role chooser, company workspace, Home, Jobs, Post a job, job page (funnel, share, Kanban
with drag + Move menu, evidence-only list, activity), candidate profile (consented info, evidence,
private notes), kind Not selected sheet, interview & outcome + index, HM interviews, per-must-have
feedback, talent, messages, company posts, company settings (overview, team, audit, billing
display-only, company, consent). Founder demo: `/dev/business?to=<path>` (mock mode). Gaps #28–#35.
Local Playwright: `business.local.ts`, `company-admin.local.ts`.

Live preview: `npm run dev` for this worktree is Cursor's (port 3010); the founder preview runs
with `ARENA_NEXT_DIST_DIR=.next-founder npm run dev -- -H 0.0.0.0 -p 3001` →
http://localhost:3001/dev/progress (phone: http://<LAN IP>:3001/dev/progress). Board frames:
`node scripts/dev/cut-boards.mjs`; statuses in `src/lib/dev/screens.json`.

**P6c Needs, offers & projects — done** (29 Sep): need intake by category (12 kinds, safety
notes, private ride pickup), offers O1–O3 on the same engine and the mirrored need page + room,
projects PR1–PR2 (paid → marketplace; collaborative → device draft, PR3–PR6 blocked on gap #26).
Create sheet: every row opens its full flow. 81 local Playwright on 3 engines.

**P6b Activities & covers — done** (29 Sep): activity taxonomy (§3), procedural unique covers
used everywhere (`Cover`), activity intake (common + per-type questions), host flow
`/activities/new` A1–A7 with the cover stored via media upload (AI covers behind
`NEXT_PUBLIC_JENNY_COVERS`, off), manage: starting soon, check-in, cancel with reason, leave.
Blocked screens (edit, waitlist, answers, attendance confirm, feedback) listed on /dev/progress
with gap numbers. 72 local Playwright on 3 engines.

**P6 Career — done** (29 Sep): intake engine (`src/lib/intake/`, `components/intake/`), career
flow `/identity/career` (intent → 6 intake steps → review → visibility → publish), `/jobs`, job
details + Apply sheet, application tracker. Scope added 29 Sep: `docs/design/ARENA-APP-FLOW.md` is
authority; `/enterprise/*` and `/admin/*` are in scope (keep APIs/auth/URLs). Mock company names
all fictional. 66 local Playwright on 3 engines. Pushes: a background loop pushes whenever
github.com is reachable (it has been unreachable from this Mac since 28 Sep).

**P5 Messages & trust — done** (commit "FE B+ P5"): Inbox `/rooms` (filters, search, relative
time), Conversation `/messages/[id]` (context card, meeting-link card, Block/Report/Close chat),
Notifications (Today/Earlier, mark read), Search (scopes, most recent only), Settings & Privacy
(board list → sheets with the unchanged controls), one ReportSheet everywhere (reason required,
also-block), resilient states via StateCard. `inbox-v3` deleted. Reduce-motion setting now drives
B+ motion. Real consumer brand names removed from mock data (Techolution/Innova left for founder).
60 local Playwright (3 engines; one load flake in needs "post a need" on Pixel 7, 5/5 on repeat).

**P4 Need → outcome — done** (commit "FE B+ P4"): Post a Need `/needs/new` (validation after
submit, offline draft, photos via media signature, preview), Need page + Offer details at
`/feed/[id]` for asks (offers = join requests; Accept → `decideJoin` → room), private coordination
room (Plan/Chat, meeting link as a room message, Mark as completed → `closeNeed` with honest
confirmation rows), Work My needs / My offers. Specimens `/dev/screen/{need-page,offer-details,
coordination-room,mark-completed}`. 45/45 local Playwright (3 engines); axe clean; review
`docs/reviews/p4.md`. Gaps #11–14 logged.

**P3 Discover & join — done** (commit "FE B+ P3"): Activity details at `/feed/[id]` (activities;
exact point only after approval; pinned Request to join), Join request sent sheet (paper plane +
status timeline + Cancel request), Approved & ready (check draw + burst, real meeting point, .ics,
share, room), Activity room `/rooms/[id]` (segmented Chat/Details/People, pinned meeting card),
Discover WHEN chips + categories (`?show=activities`). Compare specimens `/dev/screen/<id>`. Also
fixed two P2 regressions caught by the full local suite: Jenny's real proposal cards restored, and
motion features load synchronously (a stuck AnimatePresence exit left Feed blank). 36/36 local
Playwright (3 engines); axe clean on P3; review `docs/reviews/p3.md`.

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
