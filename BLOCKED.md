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

## Staging deploy credentials (Phase 4, deferred until real-mode wiring is verified locally)
- Railway API token / project access for `arena-api`
- Staging domain (e.g. `arena-staging.vikisol.in`) + DNS access or a CNAME the founder points
- Object storage decision: reuse HRLMS's Cloudinary account (new `root-folder`) or a
  separate account for Arena's CV uploads

## Phase 5 integration keys (not needed until Phase 5 scaffolding is wired to real providers)
- `RESEND_API_KEY` (transactional email) — HRLMS-BE already has a Resend account in prod;
  decide whether to reuse it or provision separately
- WhatsApp Business API credentials
- Microsoft Teams/Graph app registration (tenant ID, client ID, client secret) — HRLMS-BE
  has a working provider class for this pattern to mirror; Azure AD app itself is
  registered per-company via HRLMS's own admin UI, not an env var, so this needs its own
  registration for Arena
