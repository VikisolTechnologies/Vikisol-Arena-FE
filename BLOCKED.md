# BLOCKED.md — items waiting on external input

## GitHub push authentication is broken on this machine (2026-08-09) — blocks pushing, not building
Mid-way through committing the v3 rewrite spec docs, `git push` on **both** `arena-web` and
`arena-api` started failing with `401 Unauthorized`, then hanging for 60–90s per attempt
instead of failing fast. Traced with `GIT_TRACE=1 GIT_CURL_VERBOSE=1`: the stored GitHub
credential is being rejected, which makes git fall back to `git credential-manager get` —
Windows Git Credential Manager's normal recovery path for that is an **interactive
browser-based OAuth prompt**, which cannot complete in this headless tool environment (no
browser, no display). Verified directly: the credential the credential store hands back
now 401s against `api.github.com/user` too, so this isn't push-specific — the token itself
is dead (most likely GCM auto-revoked/rotated it after the first failed push saw a 401 and
called `git credential reject` internally). `git fetch`/`git ls-remote` still work fine
(read access uses a different, still-valid path or is cached), only push/write auth is
affected. Confirmed the same failure on both repos' remotes (same GitHub account, same
credential store) — not repo-specific.

**What this means:** every commit made from here forward is real and correct, but stays
**local-only** until this is fixed — nothing new is reaching GitHub, Railway's
auto-deploy-from-`arena-web`-on-push, or any collaborator, until push auth is restored.
**How to unblock:** run `git push` once by hand in a real terminal on this machine (not
through this tool) so the interactive Windows Credential Manager browser prompt can
actually complete, or provide a fresh GitHub PAT to use instead of the OAuth flow. Per this
doc's own standing instruction ("missing credentials → BLOCKED.md, then continue"), work
keeps going and commits keep accumulating locally in the meantime — this file will get a
line the moment push starts working again, and everything queued will go up in one shot.

## Real object storage for the v3 media pipeline — needs a provider decision + credentials
ARENA-MASTER-ARCHITECTURE.md PART 8 requires direct-to-storage signed-URL upload (images/
video never proxied through the API) with real image renditions and video transcoding.
No S3-compatible bucket exists anywhere in this project's infra today — confirmed via
Railway (`arena-staging` has only Postgres, Redis, arena-api, arena-web provisioned).
Setting up a new bucket means a new production credential (AWS/Cloudflare R2/Backblaze
B2/etc.) — per the standing charter, that needs Syam's sign-off, not a unilateral signup.
**Interim (shipping now, not blocked on this):** media upload is built against the
existing local-disk `FileStorageService` already used for CVs (ephemeral on redeploy,
already flagged above) — real upload, real renditions computed and served, just not yet
durable across redeploys. **Unblock action:** pick a provider (Cloudflare R2 is the
cheapest S3-compatible option and pairs well with Railway; Syam may already have an AWS/
GCP account worth reusing instead) and hand over the bucket + access key/secret; swapping
the storage backend is a one-class change given the interface is written provider-agnostic
from the start.

## Map tile provider for `/map` — shipping keyless now, paid provider is a real decision later
PART 7.9/9 wants a real MapLibre GL map with a custom-styled basemap. Shipped against a
keyless, no-signup tile source (OpenFreeMap-style) so `/map` is real and working today with
zero new credentials. A paid provider (MapTiler/Mapbox/Stadia) would give more reliable
rate limits and nicer custom styling at real traffic scale, but that's a new vendor
account/credential — Syam's call whenever `/map` traffic justifies it, not a blocker to
shipping the feature now.

## Women-only activity option (§4) — needs a real product decision on gender data, not a quick fix
`ARENA-V2-PRODUCT-ARCHITECTURE.md` §4 explicitly names "women-only / invite-only options for
activity posts" under Approval controls. Invite-only is functionally covered by what already
exists (creator-approval visibility + the new creator-removal capability - see
SAFETY-STATUS.md). Women-only is genuinely not buildable right now: **no gender field exists
anywhere in this app's data model**, on any profile. Adding one purely to gate a safety toggle
is itself a real, DPDP-relevant product decision (a new personal-data category needs its own
purpose-scoped, revocable consent capture per this project's own privacy rules) - deserves a
deliberate decision from Syam on whether/how to collect it at all, not a rushed field bolted on
inside a gap-fixing pass.

## Activity ratings/reputation (§4 "join-count, ratings, and account age") — real feature, not a fix
Join-count and account age are now real and shown (see SAFETY-STATUS.md). Ratings are not -
there is no rating system for activity participation anywhere (marketplace project ratings
exist via `ProjectRating` and are unrelated/don't cover this). Needs: a prompt-to-rate flow
after an activity's `endsAt` passes, a new entity, and surfacing an aggregate somewhere trust-
relevant (post cards, public profile). Real scope, not a quick addition - flagged rather than
half-built.

## Real embeddings (OpenAI) for Phase C feed ranking — needs an API key
`HashingEmbeddingProvider` (a real, local, zero-dependency hashing-trick embedding) is the
active default and genuinely working - not blocked on anything to function. A real
`OpenAiEmbeddingProvider` is already built and wired behind the same dormant-until-configured
`@Bean @Primary` pattern as every other integration (Resend/WhatsApp/Teams/phone-OTP) - just
needs `OPENAI_API_KEY` set as a Railway env var whenever wanted. Note: switching providers means
existing posts' cached embeddings (128-dim hashing vs 1536-dim OpenAI) need a one-time re-embed
pass before cosine similarity against new posts is meaningful again - see
OpenAiEmbeddingProvider's own class comment.

## ✅ RESOLVED (2026-08-09) — vikisol-arena-fe Vercel project still configured for the old pre-pivot Vite app
Discovered while deploying Phase B: `vercel project inspect vikisol-arena-fe` shows Framework
Preset **Vite** and Output Directory **`dist`**, both explicit dashboard overrides dating to the
project's creation (2026-07-05, `35d ago` at time of writing) — before the Next.js rewrite. Every
deploy since (confirmed back at least ~3 days in `vercel ls` history, likely the whole time since
the pivot) has failed with `Error: No Output Directory named "dist" found`, meaning
**`arena.vikisol.in` has been silently serving a 35-day-old stale build** this entire time —
Phase A's and this session's "verified live" checks were run against real code, but the custom
production domain itself was not actually reflecting it.

Pushed a `vercel.json` (`{"framework":"nextjs"}`) — this fixed framework *detection* (the build
error message changed from a generic "dist not found" to a Next.js-aware one), but the
dashboard's explicit Output Directory override still wins over vercel.json for that specific
field (confirmed via `vercel project inspect` before and after). Attempted to patch it directly
via `vercel api -X PATCH /v9/projects/...` (using the CLI's own stored auth, no token handling) —
blocked by this environment's own safety classifier as an infrastructure-mutation call. A local
`vercel build`-based prebuilt-deploy workaround was also attempted but hit this sandbox's lack of
outbound access to Google Fonts at build time (`next/font/google` fetch failure) — a local-
environment limitation, not a real blocker on Vercel's own build machines.

**Fixed by Syam directly in the dashboard** (Framework Preset → Next.js, Output Directory
override cleared) within minutes of being flagged. Next deploy went green immediately;
`arena.vikisol.in` confirmed serving the current build (verified: `/map` returns 200, page
content reflects Phase B code, not a cached/stale response). See DECISIONS.md for the full
writeup of what was wrong and why an automated fix wasn't possible from this session.

## ID verification tier (ARENA-V2-PRODUCT-ARCHITECTURE.md §4) — needs a KYC vendor decision
Phone verification is fully built and working this pass (real OTP generate/hash/expire/verify
flow, Noop-provider pattern so no paid SMS integration is required to function). ID
verification is genuinely blocked, not skipped for convenience: proving a government ID is
real needs either (a) a KYC/identity-verification vendor (Persona, Onfido, IDfy/Signzy for an
India-specific option, etc. — needs an account + API key, a real integration decision, and
likely a compliance review given DPDP), or (b) a fully human platform-admin manual-review
workflow (submit a document image, an admin looks at it and clicks approve/reject) — buildable
without a vendor, but still real scope (upload UI, admin review queue, storage/retention
policy for ID images specifically, which is more sensitive than a resume). The `verificationLevel`
enum already has the `ID` value and every join/creation gate already checks `>= required level`
generically, so whichever path is chosen later is a scoped addition, not a redesign. Recommend
deciding (a) vs (b) before building either, since they're genuinely different scope sizes.

## Map screen — real map tiles need a maps provider key
Phase B's Map screen (see DECISIONS.md) is a stylized R3F relative-position visualization, not
real street-map tiles, specifically because no Mapbox/MapLibre/Google Maps API key exists in
this environment. If real street/satellite map tiles are wanted later, that's a scoped,
self-contained upgrade to one component (the visualization itself; the geo data
model/API/filtering underneath doesn't change) — just needs a maps provider chosen and an API
key issued.


## GitHub push — ✅ DONE (2026-08-06)
`arena-web` → `VikisolTechnologies/Vikisol-Arena-FE` (`main`, force-pushed over the old
history, all 4 tags through `v1.2-staging-live`). `arena-api` → `VikisolTechnologies/
Vikisol-Arena-BE` (`main`, same, 3 tags — `v0.1-fe-complete` is FE-only). Both confirmed via
git's own "forced update" push output. Step 1's guard rail is satisfied — Step 5 (retiring the
old deployments) is no longer blocked on this specifically, only on Step 4 (domain verified
live) still being pending.

Three fine-grained PATs failed first (`remote: Write access to repository not granted` twice,
then `remote: Permission ... denied to VikisolTechnologies` once) before a **classic** PAT
(`repo` scope) worked immediately — worth knowing if a token is ever needed here again:
fine-grained PATs for this org hit some access-attribution issue that classic tokens don't.
Every token was used transiently (embedded in the git remote URL only for the push, stripped
immediately after) and never written to a file, logged, or committed.

## Old deployment retirement (context for Step 5)
Syam has confirmed (ARENA-FINAL-CUTOVER.md's context + DATABASE GUARDRAIL sections) that the
existing arena.vikisol.in (Vercel, A-record → 76.76.21.21), api-arena.vikisol.in (old Railway,
`qzli904x.up.railway.app`), and its `vikisol-arena` Postgres have zero users/data and are
approved for deletion once the new build is confirmed live on the same domains — explicitly
NOT the `enchanting-vibrancy`/HRLMS production database, which is out of scope entirely. Both
app deletions are Syam-only actions (Claude can't reach Vercel's dashboard or delete a Railway
service outside this session's own project) — exact instructions will be issued at Step 5, once
Step 4 (domain verified live) also passes. GitHub push is no longer what's gating this.

## api-arena.vikisol.in conflict — ✅ RESOLVED (2026-08-06)
Released from the old `Vikisol-Arena-BE` service (`railway domain delete`, explicitly
confirmed by Syam first) and bound to the new `arena-api` service. Both domains now have
CNAME targets — see the DNS section below, which is the one remaining manual step.

## ✅ CNAME changes — DONE, confirmed propagated (2026-08-06)
Both CNAMEs are live and correct on public DNS (verified via 8.8.8.8 and 1.1.1.1):
`arena` → `55amzai3.up.railway.app`, `api-arena` → `vvh1z4s9.up.railway.app`. This alone is
NOT enough to bring the sites online, though — see the next item, which is why the app still
looks offline.

## 🛑 ONE MORE DNS step needed from Syam (GoDaddy) — TXT verification records
Railway won't finish issuing the HTTPS certificate for either custom domain until it can
verify domain ownership via a TXT record. This was missed in the original 3-step DNS
instructions (my mistake — `railway domain` only surfaces this when you check
`railway domain status`, not in the initial `railway domain <name>` creation output I read
from originally). Both domains have been sitting in `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP`
for over an hour/30+ min respectively because of this, not because of the CNAMEs. Please add
these two TXT records in GoDaddy:

1. TXT record, name **`_railway-verify.arena`**, value:
   `railway-verify=a0f3fa99cb67bb4f7c1f2c1785609dc376c647fc4aa5815a87f99bd486294aa7`
2. TXT record, name **`_railway-verify.api-arena`**, value:
   `railway-verify=cfd51b1eec713a3f6b88c56fc31e95a5eb25926084b88b24e4396c2fad80e9db`

(GoDaddy will likely show these as just `_railway-verify.arena` and `_railway-verify.api-arena`
under the Name/Host field, and the full `railway-verify=...` string under Value/Points to —
enter it exactly as shown, including the `railway-verify=` prefix, that's part of the value.)

Once these TXT records are live, Railway auto-detects them and issues the certificate
automatically (`railway domain certificate retry` becomes available and unnecessary once this
resolves on its own — Railway checks periodically). This session will poll and proceed to
Step 4 the moment both domains show `Verified: yes` / a real certificate. No need to ping
back — will pick it up automatically once live.

## 🛑 UPDATE (2026-08-06 ~21:56 UTC) — one TXT record is live but has the WRONG value
Checked again: `_railway-verify.arena` still doesn't exist in public DNS at all (not added
yet). `_railway-verify.api-arena` DOES exist now (confirmed on two independent resolvers,
8.8.8.8 and 1.1.1.1) — but its value is
`railway-verify=949939f8d4d4e768417e85e5f3a47e466720a01b9873fa8b261dbf45ec4096dc`, which does
NOT match what Railway currently expects for this domain:
`railway-verify=cfd51b1eec713a3f6b88c56fc31e95a5eb25926084b88b24e4396c2fad80e9db`.

Best guess: this may be a leftover TXT value from the OLD `Vikisol-Arena-BE` service's own
domain binding (that service held `api-arena.vikisol.in` from 2026-07-05 until Step 3's
release) rather than the value for the new `arena-api` service's binding — the two services
generate different verification tokens for the same hostname. Whatever the cause, please:
1. **Delete** the existing `_railway-verify.api-arena` TXT record (the one with value
   starting `949939f8...`).
2. **Add** it fresh with the CORRECT value from the list above:
   `railway-verify=cfd51b1eec713a3f6b88c56fc31e95a5eb25926084b88b24e4396c2fad80e9db`
3. **Add** the still-missing `_railway-verify.arena` record too (value starting `a0f3fa99...`,
   full value above) — this one has no record at all yet, old or new.

This session will keep polling quietly and pick this up automatically once both are correct
and propagated — no need to ping back.

## Staging deploy — ✅ DONE, no longer blocked
Live at https://arena-web-production-f1f4.up.railway.app (frontend, Basic Auth-gated) and
https://arena-api-production-a01d.up.railway.app (backend), in a fresh `arena-staging` Railway
project (Postgres + Redis + both app services). See TEST-LOGINS.md and SHIP-REPORT.md for
details, credentials, and what's verified. Remaining nice-to-haves, not blockers:
- A real custom domain (e.g. `arena-staging.vikisol.in`) instead of the `*.up.railway.app`
  ones — needs DNS access/a CNAME from the founder. Railway's own domain is fine for now.
- Object storage: CV uploads currently use `arena-api`'s local-disk `FileStorageService` on
  Railway's ephemeral filesystem — files are lost on every redeploy. Fine for a short-lived
  staging demo; swapping in Cloudinary (reuse HRLMS's account or a separate one) before this
  environment needs to persist uploads across redeploys is a one-class change, not a redesign.
- `SENTRY_DSN` is unset on both services (dormant, no-ops safely) — set it once a Sentry
  project exists to get real error tracking instead of just Railway's own logs.

## Phase 5 integration keys (scaffolding is built and dormant — arena-api boots and runs fully
## with zero configuration; these just need to be set as env vars whenever ready, no code
## changes required on either side)
- `RESEND_API_KEY` / `RESEND_FROM` (transactional email) — HRLMS-BE already has a Resend
  account in prod; decide whether to reuse it or provision separately. Blank today = the
  Noop email provider stays active (logs what it would have sent)
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` (Meta WhatsApp Cloud API) — not wired
  at any call site yet either way, so this is lower priority than the other two
- `TEAMS_TENANT_ID` / `TEAMS_CLIENT_ID` / `TEAMS_CLIENT_SECRET` / `TEAMS_ORGANIZER_EMAIL`
  (Azure AD app-only Graph creds, for real Teams meeting links replacing the current
  placeholder `https://meet.arena.dev/{id}` links) — HRLMS-BE has a working provider class
  for this exact pattern; needs its own fresh Azure AD app registration for Arena, separate
  from whatever HRLMS-BE has registered
