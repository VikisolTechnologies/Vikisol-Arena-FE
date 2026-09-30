# Shared changes needed for P11 account & people screens

**Done on merge into `feature/arena-vnext-mobile-jenny` (30 Sep)** — architect call: canonical
public-profile URL is `/people/[id]`; `/neighbour/[id]` redirects there (`next.config.ts`), so its
B+ page (and the `n-arjun`/`n-hidden` specimen fixtures) were removed rather than kept dead.
- `src/components/settings/SettingsScreen.tsx`: Download my data, Blocked accounts and Delete
  account rows now `href` to `/account/export`, `/account/blocked`, `/account/delete` (dropping
  their inline sheets, which those pages are a strict superset of); added rows for Edit profile
  (`/account/edit`), Notification preferences (`/account/notifications`, distinct from the
  existing Notifications-inbox row), Share profile (`/account/share`) and a new Help group
  (`/account/help`).
- `src/components/screens/ProfileScreen.tsx` ("You"): added a Share icon button (`/account/share`)
  next to Settings in the header. The main **Edit** button was deliberately left pointing at
  `/identity/edit`, not `/account/edit` — that route is the real, API-backed edit surface (skills,
  CV, verification); `/account/edit` is a simpler local-draft specimen and routing the primary
  Edit button there would have been a functional regression, not a wire-up.
- `src/lib/api/httpClient.ts` + new `src/lib/api/sessionExpired.ts`: a failed-refresh 401 now
  calls `clearToken()` + `clearSession()` and reports a global "session expired" flag (mirrors
  `apiHealth.ts`'s down-banner pattern). `src/components/account/SessionExpiredMount.tsx`, mounted
  via an idle-deferred `DeferredSessionExpired` in the root layout, renders `SessionExpiredSheet`
  off that flag; "Sign in again" clears it and routes to `/auth?mode=signin`. Drafts (intake,
  compose, ...) live under separate localStorage keys untouched by `clearSession()`.
- `playwright.mock.config.ts`: `testMatch` now covers both `**/admin/**/*.spec.ts` and
  `**/account/**/*.spec.ts`.
- `tests/e2e/account/account-routes.spec.ts`: the two `/neighbour/*` content-assertion rows were
  replaced with a redirect-behavior test (`/neighbour/n-arjun` → `/people/n-arjun`), since that
  content no longer renders at that URL by design.

Backend: gaps **#58–#60** in `docs/FE-API-GAPS.md` (renumbered on merge — were #52–#54 on this
branch; notification prefs persistence, edit-profile fields, profile visibility for share links).
Gap #18 already covers prefs; #58 references the account screen.
