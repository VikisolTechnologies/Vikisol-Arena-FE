# Progress

**FE owner: Claude Code. Mission: `docs/missions/FE-BPLUS-BUILD.md`. Design is final
(`docs/design/*`). Cursor no longer touches FE except the separate P0 security release.**

Updated 28 Sep 2026. Resume from here.

## Current status

On branch `feature/arena-vnext-mobile-jenny`. Setup done: mission recorded, screen spec + tokens
written (`docs/design/BPLUS-SCREENS.md`, `docs/design/TOKENS.md`), repo docs cleaned to the
kept-list in `CLAUDE.md`/`AGENTS.md` (commit "docs: remove superseded plans, designs and
credentials" — see the deleted-files list below). **Not started yet: P0 (foundation) build** —
tokens/fonts in Tailwind, AppShell rebuild, component kit, data layer, `/dev/kit`. M1A (old
onboarding/auth work at `d746cf9`/`1e8bf98`, built to a now-superseded design) is still live in
the tree; P1 will restyle or rebuild it against the real B+ boards, deleting the old version in
the same commit per the mission's "no parallel old and new" rule.

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
