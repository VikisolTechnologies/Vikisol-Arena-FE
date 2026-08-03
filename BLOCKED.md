# BLOCKED.md — items waiting on external input

## GitHub push (arena-web + arena-api)
Neither repo is pushed anywhere yet — both are local-only. `gh` CLI is not installed in
this environment and no token has been provided, so I cannot create the remote repos
myself. Per the sprint rules, the moment a token or pre-created repo exists in this
session, both repos get pushed before anything else continues.

**What's needed** (either one):
- A GitHub Personal Access Token (repo scope) for the VikisolTechnologies org, or
- The two empty private repos created manually — `VikisolTechnologies/arena-web` and
  `VikisolTechnologies/arena-api` — with their URLs passed back.

## Staging deploy credentials (Phase 4 — real-mode wiring is now verified locally, so this is
## the next real blocker on the path to a staging deploy)
- Railway API token / project access for `arena-api`
- Staging domain (e.g. `arena-staging.vikisol.in`) + DNS access or a CNAME the founder points
- Object storage decision: reuse HRLMS's Cloudinary account (new `root-folder`) or a
  separate account for Arena's CV uploads — `arena-api` already abstracts this behind
  `FileStorageService` (local-disk implementation active today), so swapping in Cloudinary
  once a decision + credentials exist is a one-class change, not a redesign

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
