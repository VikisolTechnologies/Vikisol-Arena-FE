# ARENA-FINAL-CUTOVER.md — Push, deploy to arena.vikisol.in (gated), retire old — final

> Read fully, work in ORDER, never skip ahead. The order exists so the only backup
> isn't destroyed before the new build is safe. Decisions → DECISIONS.md. Credentials
> you don't have → BLOCKED.md, then stop at that step. DNS and dashboard deletions are
> Syam-only — output exact instructions and WAIT; never work around them.

## 🔐 TOKEN HANDLING — read first
Syam will paste a GitHub fine-grained PAT (access to Vikisol-Arena-FE + Vikisol-Arena-BE,
Contents + Administration read/write) directly into THIS Claude Code session in the
terminal. Use it only to configure the git remote / push. Do NOT echo it, log it, write
it to any file, or commit it anywhere. If it ever appears in a file or command output,
tell Syam to revoke it. Prefer `git remote set-url origin https://<token>@github.com/...`
used transiently, or a credential helper — never a committed value.

## 🚨 DATABASE GUARDRAIL — absolute, non-negotiable
Three Postgres databases exist on Railway. Their handling is FIXED:
- **arena-staging DB** (in the new `arena-staging` project) — KEEP. This is the live DB
  the new build uses. It is already connected to the new arena-api — nothing to wire.
- **vikisol-arena DB** (old pre-rewrite Arena project) — the ONLY database that may be
  deleted, and ONLY in Step 5 after GitHub + domain are verified. Zero users/zero data.
- **enchanting-vibrancy / vikisol-hrlms-be DB** — HRLMS PRODUCTION with real employee
  data. NEVER touch, query, migrate, or delete. Not in scope for anything in this file.
If any step is ambiguous about which DB it targets, STOP and ask Syam. Deleting the wrong
DB is the one irreversible catastrophe here.

## STEP 1 — Push to GitHub FIRST (hard prerequisite for Step 5)
- REUSE existing repos (do NOT create new): arena-web → Vikisol-Arena-FE,
  arena-api → Vikisol-Arena-BE.
- Force-push the new clean local history over each, replacing old code AND history:
    git remote add origin <repo-url>   (or set-url if origin exists)
    git push --force origin <branch> --tags
- After each push, VERIFY on GitHub that only the new code + our tags (through
  v1.2-staging-live) are present. Confirm the URL is right before pushing — force-push is
  irreversible on the remote (intended here; we're overwriting dead repos).
- If no token this session → BLOCKED.md top item, STOP, do not run Step 5's deletions.
  Steps 2–4 may still proceed.

## STEP 2 — App config for production domains (already largely done — verify)
On the new build only: frontend API base URL → https://api-arena.vikisol.in/api/v1;
NEXT_PUBLIC_API_MODE=real; CORS allow-list includes https://arena.vikisol.in; CSRF/cookie
domain → .vikisol.in; OAuth redirect URIs → arena.vikisol.in callbacks (list any that must
also be added in Google Cloud console → BLOCKED.md for Syam). Basic Auth gate stays ON.
Commit anything not already committed.

## STEP 3 — Railway domain binding + DNS values (Syam does DNS + the release)
- Frontend already bound: `arena` → CNAME `55amzai3.up.railway.app`.
- api-arena.vikisol.in is still claimed by the OLD Vikisol-Arena-BE service. Syam must
  release it: Railway → Vikisol-Arena project → Vikisol-Arena-BE → Settings → Networking
  → remove custom domain api-arena.vikisol.in. Once released, bind api-arena.vikisol.in to
  the NEW arena-api service and OUTPUT its CNAME target.
- Then give Syam BOTH GoDaddy changes to apply together (Claude cannot reach DNS):
  1. DELETE the `arena` A record (76.76.21.21, old Vercel).
  2. ADD CNAME `arena` → 55amzai3.up.railway.app
  3. UPDATE CNAME `api-arena` → <new arena-api target>
- WAIT for Syam to confirm DNS propagated before treating the domains as live.

## STEP 4 — Deploy + verify on the real domain (behind the gate)
- Deploy new arena-web + arena-api on these domains, real mode, migrations applied, seed
  loaded (into the arena-staging DB — never the HRLMS DB).
- After propagation, full smoke test against https://arena.vikisol.in behind the gate:
  each role signs in → onboard → resume upload → apply → interview → bid → award →
  enterprise search → unlock → message → company-admin → platform-admin. Fix, redeploy,
  re-smoke. Zero console errors. Confirm Basic Auth challenges on both hosts.
- Update TEST-LOGINS.md URLs to the real domain; re-verify every account. Tag
  `v1.3-live-on-domain`.

## STEP 5 — Retire the old (ONLY after Steps 1 AND 4 both verified green)
Guard rail: new build must be BOTH on GitHub AND confirmed serving arena.vikisol.in first.
- Syam-only (output as instructions): delete/disconnect the old Vercel project; delete the
  old arena-api Railway service; delete the old **vikisol-arena** Postgres (NOT the HRLMS
  DB — see guardrail).
- Claude may clean dead config/remotes in the new repos and commit.
- Record retirement (with dates, and an explicit note that HRLMS DB was untouched) in
  DECISIONS.md.

## STEP 6 — Report
CUTOVER-REPORT.md: what serves arena.vikisol.in, gate status (ON), updated test logins,
what was retired, and the standing launch-gate items still owned by Syam (lawyer-reviewed
privacy policy/ToS, GST + Razorpay KYC, pentest, CV storage → Cloudinary so uploads
survive redeploys, PITR backups, and the final "remove Basic Auth to go public" step). Do
NOT remove the gate.

## Definition of done
Code force-pushed to the two existing repos (new code only) · config verified for the prod
domains · DNS values handed to Syam and applied · deployed + smoke-tested green on
arena.vikisol.in behind the gate · old Vercel/Railway/vikisol-arena-DB retired (HRLMS DB
untouched) · TEST-LOGINS.md updated · tag v1.3-live-on-domain · gate still ON.
