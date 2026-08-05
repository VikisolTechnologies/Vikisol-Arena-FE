# ARENA-GO-LIVE-ON-DOMAIN.md — Move the new build onto arena.vikisol.in (gated), retire the old

> Read fully, work in ORDER, do not skip ahead. The ORDER is the whole point of this
> file — it exists so the only backup isn't deleted before the new build is safe.
> Decisions → DECISIONS.md. Anything needing a credential Syam hasn't provided →
> BLOCKED.md, then stop at that step and tell Syam exactly what's needed (don't work
> around it). Some steps are Syam-only (DNS, deleting Vercel) — for those, output the
> precise instruction and WAIT; do not attempt what you can't reach.

## Context (already decided by Syam — do not re-litigate)
- The old arena.vikisol.in (served by Vercel, DNS A-record → 76.76.21.21) and
  api-arena.vikisol.in (old Railway) have ZERO users and ZERO data. Syam has approved
  deleting them.
- We are NOT using a separate staging subdomain. The new build goes onto the existing
  domains: arena-web → arena.vikisol.in, arena-api → api-arena.vikisol.in.
- The Basic Auth gate STAYS ON. Reusing the public domain does not mean going public —
  removing the gate is a later launch-gate action, NOT part of this run.

## STEP 1 — Push to GitHub FIRST (hard prerequisite for everything after)
- If a GitHub token / gh CLI is available this session: create private repos
  VikisolTechnologies/arena-web and VikisolTechnologies/arena-api, push all branches
  and tags (through v1.2-staging-live), confirm both remotes.
- If NO token this session: STOP here. Write BLOCKED.md's top item as "GitHub token
  needed before domain cutover — refusing to delete the old deployment while the new
  build exists only on this machine." Do NOT proceed to Step 4's deletions. You may
  still do Steps 2–3 (config), but the retirement in Step 5 must not happen until the
  push is done. This ordering is deliberate and non-negotiable.

## STEP 2 — App config for the production domains (code you own)
On the NEW build only:
- Frontend API base URL → https://api-arena.vikisol.in/api/v1 ; NEXT_PUBLIC_API_MODE=real.
- CORS allow-list: add https://arena.vikisol.in (and drop the temporary Railway *.up.railway.app
  origins if present, or keep them for fallback testing — your call, note it).
- CSRF / cookie domain → .vikisol.in as appropriate so auth cookies work on the real host.
- OAuth redirect URIs → the arena.vikisol.in callbacks (Google etc.). List any redirect
  URIs that must ALSO be added in the Google Cloud console in BLOCKED.md — Syam adds those.
- Keep the Basic Auth gate ON and confirm it still challenges before the app loads.
- Commit. Do not deploy to the domain yet — DNS (Step 3) comes first or in parallel.

## STEP 3 — Railway domain binding + DNS (Syam-only for DNS; you give exact values)
- In Railway, add custom domain arena.vikisol.in to the new arena-web service and
  api-arena.vikisol.in to the new arena-api service. Railway will show a CNAME target
  for each. OUTPUT those exact targets to Syam.
- Tell Syam to do this in GoDaddy DNS (Claude cannot reach DNS):
  1. DELETE the existing `arena` A record (76.76.21.21 — old Vercel).
  2. ADD a CNAME: name `arena` → <Railway target for arena-web>.
  3. UPDATE the `api-arena` CNAME to → <Railway target for the NEW arena-api>
     (it currently points at the old Railway service qzli904x.up.railway.app).
  Note: apex/root would need an ALIAS, but `arena` is a subdomain so a CNAME is fine.
- WAIT for Syam to confirm DNS is changed and propagated before treating the domain as live.

## STEP 4 — Deploy + verify on the real domain
- Deploy the new arena-web + arena-api to Railway on these domains, real mode,
  migrations applied, seed loaded.
- After DNS propagates: full smoke test against https://arena.vikisol.in (behind the
  gate): sign in each role → onboard → upload resume → apply → interview → bid → award →
  enterprise search → unlock → message → company-admin views → platform-admin. Fix
  anything broken in the deployed env, redeploy, re-smoke. Zero console errors.
- Confirm the Basic Auth gate challenges on both arena.vikisol.in and api-arena.vikisol.in.
- Re-verify TEST-LOGINS.md accounts all work on the real domain; update the URLs in it.
- Tag `v1.3-live-on-domain`.

## STEP 5 — Retire the old deployments (ONLY after Steps 1 and 4 both pass)
- Do NOT run this step if Step 1 is blocked (code not on GitHub) or Step 4 hasn't
  verified green on the domain. Guard rail: the new build must be BOTH on GitHub AND
  confirmed serving the domain before anything old is deleted.
- Syam-only actions (output as instructions, Claude cannot reach these): delete or
  disconnect the old Vercel project so it stops building/serving; delete the old
  arena-api Railway service (qzli904x).
- Anything Claude can do (e.g. remove old repo remotes/references in the new repos,
  clean up dead config) — do it and commit.
- Record the full retirement in DECISIONS.md with dates.

## STEP 6 — Report
Write DOMAIN-CUTOVER-REPORT.md: what's now serving arena.vikisol.in, the gate status,
updated test logins, what was retired, and the standing launch-gate items still owned by
Syam (lawyer-reviewed privacy policy/ToS, GST + Razorpay KYC, pentest, PITR backups,
and the final "remove Basic Auth to go public" step). Do not remove the gate.

## Definition of done
Code on GitHub · new build configured for arena.vikisol.in + api-arena.vikisol.in ·
DNS values handed to Syam · deployed and smoke-tested green on the domain behind the gate ·
old Vercel/Railway retirement instructions issued (and executed only after GitHub + domain
verified) · TEST-LOGINS.md updated · tag v1.3-live-on-domain · gate still ON.
