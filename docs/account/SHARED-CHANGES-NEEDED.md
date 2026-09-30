# Shared changes needed for P11 account & people screens

P11 only adds new routes under `/account/*` and `/neighbour/[id]`, plus `src/components/account/**`.
These existing surfaces should be wired by a follow-up (do not edit in this mission):

| File / surface | Needed change |
|---|---|
| `src/components/settings/SettingsScreen.tsx` | Point rows to full pages: Edit profile → `/account/edit`; Notification preferences → `/account/notifications` (not only `/notifications` inbox); Blocked → `/account/blocked`; Download data → `/account/export`; Delete → `/account/delete`; add Help & safety → `/account/help`; Share profile → `/account/share`. Keep sheets as shortcuts if desired. |
| `src/components/screens/YouScreen.tsx` (or identity header Edit) | Edit button → `/account/edit`; Share → `/account/share`. |
| Root layout / `AppShell` / API client | Mount `SessionExpiredSheet` when a 401 arrives; preserve drafts (intake / compose) before clearing session. Specimen lives at `/account/session-expired`. |
| Feed / Discover people tiles, Message links | Prefer `/neighbour/[id]` (B+) over legacy `/people/[id]` once approved — or restyle `/people/[id]` in place. |
| `src/app/people/[id]/page.tsx` | Legacy public profile; leave until architect chooses redirect vs restyle. |
| `playwright.mock.config.ts` | Add `tests/e2e/account` to testDir (or a second project) if mock config is shared with admin only. |

Backend: gaps **#52–#54** in `docs/FE-API-GAPS.md` (notification prefs persistence, edit-profile fields, profile visibility for share links). Gap #18 already covers prefs; #52 references the account screen.
