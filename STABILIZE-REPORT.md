# STABILIZE-REPORT.md — ARENA-STABILIZE.md execution log (2026-08-12)

Living document, updated as each phase completes. Phases run strictly in order per
`ARENA-STABILIZE.md`; nothing in Phase N started before Phase N-1 was verified.

---

## Phase 0 — Make deploys trustworthy

### 0.1 — arena-api's broken auto-deploy: root cause + fix

**Root cause**: `arena-api`'s Railway service had **no GitHub source connected at all**
(`railway service list --json` showed `"source": null`, vs. `arena-web`'s
`"source": {"repo": "VikisolTechnologies/Vikisol-Arena-FE"}`). There was no webhook to be
broken — there was nothing to attach one to. Every prior "successful" deploy of arena-api
(including the ones logged in the earlier `SLEEP-REPORT.md` investigation) came from
`railway up`, a direct local-disk upload that bypasses git entirely, or from
`railway redeploy --from-source`, which — with no connected source — just re-ran the last
uploaded snapshot and reported `SUCCESS` regardless of what was on `origin/main`. That is
exactly the "green deploy, stale code" symptom that investigation documented, now explained.

**Fix**: `railway service source connect --repo VikisolTechnologies/Vikisol-Arena-BE --branch main --service arena-api`.
No dashboard clicks were needed — the CLI's `service source connect` subcommand does the
same thing GitHub-App-based reconnection would, so nothing went to `BLOCKED.md`. Connecting
the source triggered an immediate build on its own, confirming the webhook was live.

### 0.2 — Build stamps (staleness visible in 5 seconds)

- **arena-api**: new public `GET /version` (`/api/v1/version`) returning
  `{"commit": "<sha>", "builtAt": "<iso8601>"}`. Values come from `build-info.properties`,
  written into the image by the Dockerfile at build time from Railway's
  `RAILWAY_GIT_COMMIT_SHA` (auto-forwarded as a Docker build arg for git-connected services —
  confirmed working, see proof below). `VersionController` reads the file once at startup;
  `SecurityConfig` gets an explicit `GET /version` → `permitAll()` rule since the filter chain
  runs before method security and would otherwise 401 it.
- **arena-web**: new `BuildStamp` component — a small `text-ink-300` corner badge, mounted once
  in the root `layout.tsx` so it's present on every route regardless of which role shell wraps
  the page — plus a public `GET /version` route handler returning the same JSON shape. Values
  come from `NEXT_PUBLIC_BUILD_COMMIT`/`NEXT_PUBLIC_BUILD_TIME`, written into
  `.env.production.local` by the Dockerfile before `npm run build` (Next.js inlines
  `NEXT_PUBLIC_*` at build time, so this has to happen before the build step, not read at
  runtime). It's a plain component (no `"use client"`), so it renders server-side into the
  initial HTML — visible with zero JS execution, confirmed by `curl`ing the homepage directly.

### 0.3 — Stuck doc commits + the actual git-hang root cause

The two doc commits stuck since the last session (`b43da52`, `0c726c4`) were **not** a
Windows Credential Manager UI hang in the way it looked. Traced with
`GIT_CURL_VERBOSE=1 GIT_TRACE=1`: the system-level Git config
(`C:\Program Files\Git\etc\gitconfig`) sets `credential.helper = manager`, and the user's
global config *additionally* sets `credential.helper = store`. Git tries every configured
helper in order — `manager` first. `git-credential-manager get` then hangs indefinitely
waiting for an interactive browser/WAM prompt that this shell can never show or complete. The
working GitHub PAT was sitting the whole time in `~/.git-credentials`, reachable via `store`,
but `store` never even got tried because `manager` never returned.

**Fix**: reset each repo's local `credential.helper` to just `store`
(`git config --local credential.helper ""` then `git config --local --add credential.helper store` —
the empty value clears the inherited system/global list before re-adding `store` alone). Applied
to both `arena-web` and `arena-api`. Every push since has completed in well under a minute,
including from a cold shell. This was previously misdiagnosed as a "recurring, unresolved"
Windows GCM flake; it is actually a deterministic config conflict with a one-line fix.

### 0.4 — Proof: full commit → push → build → live-hash loop, both services

Pushed the Phase 0.2 build-stamp commits themselves as the live test:

| Service | Commit pushed | Live `/version` commit | Match |
|---|---|---|---|
| arena-api | `eea1e6c` | `eea1e6c5c417fa0c35b910a126f8649eafce8239` | ✅ |
| arena-web | `a583a5d` | `a583a5d7c46a1264608188077611ca6f5b8243f7` | ✅ |

Both builds triggered automatically from `git push`, both reached `SUCCESS`, both live commit
hashes exactly match what was pushed. `curl https://api-arena.vikisol.in/api/v1/version` and
`curl https://arena.vikisol.in/version` are now the standing way to verify "is this actually
deployed" — no more trusting a green Railway status alone.

**Phase 0 is green.** Proceeding to Phase 1.

---

## Phase 1 — Mobile home slowness: root cause with evidence

*(in progress)*
