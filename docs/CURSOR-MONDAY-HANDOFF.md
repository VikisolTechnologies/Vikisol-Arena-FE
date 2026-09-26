# Monday handoff — 27 Sep 2026

Owner for this slice: Cursor, on `feature/arena-vnext-mobile-jenny`.

## Stopped at

`d746cf9` — M1A: rebuild mobile authentication and progressive onboarding.

Review: `docs/reviews/d746cf9.md`. Screenshots: `docs/reviews/m1a/`.

Uncommitted control-plane docs are still in the worktree (`AGENTS.md`, `CLAUDE.md`, `docs/ARENA-MISSION.md`, `docs/VIKISOL-MASTER-CONTEXT.md`, `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md`, `docs/missions/`, `docs/reviews/AUDIT-2026-09-26.md`). They were not part of `d746cf9`. Do not reset them.

## Do not

- Merge PR #1 or `feature/arena-vnext`.
- Deploy this branch to production, change DNS, or create another Vercel project.
- Print or commit demo passwords.
- Touch Vikisol One or JennySol.

## Preview

`https://preview-arena.vikisol.in` points at deployment `d0661b1` (implementation `d746cf9`, review `efa4234`, version stamp `d0661b1`). `/version` returned that commit. The preview stays behind Vercel SSO. Production was not changed.

## Founder check

1. Open the protected preview on a phone, or a 390px window.
2. Join as a person with a new email. Confirm the form never offers Recruiter, Hiring manager, or Platform admin.
3. Skip location and title. Enter Arena. The feed should not name a job or a city you did not type.
4. Sign out from You, then sign in again. You should land on the feed, not a second copy of the questionnaire.
5. Use Forgot password. An incomplete reset link should say the link has expired.

## Next, after architect review

Rich feed cards, Discover's map mode, and the optional private career layer. Not before this review.
