# TEST-LOGINS.md — Arena staging accounts

Staging URLs (private — see access note below):
- **Frontend:** https://arena-web-production-f1f4.up.railway.app
- **Backend API:** https://arena-api-production-a01d.up.railway.app/api/v1

**Access gate:** the frontend requires an HTTP Basic Auth prompt before anything loads (keeps
this out of search engines and off-limits to anyone without the link — see DECISIONS.md).
Credentials for that gate are separate from the app logins below and were shared with the
founder directly, not written into this file (a repo-committed staging password isn't a
staging-only throwaway the same way a demo account is).

All accounts below use the same password: **`Demo@12345`**. These are staging-only demo
accounts on a private database with no real user data — not to be reused anywhere real.

| Role | Email | What to test here |
|---|---|---|
| Talent (candidate) | `demo.talent@vikisol.dev` | Onboarded profile (Aarav Sharma), resume/CV already uploaded, live application history across several postings, agent chat + activity journal, settings (consent toggles, data export, account deletion). |
| Company Admin | `demo.enterprise@vikisol.dev` | Full admin console: dashboard (real activity now seeded — see below), team (3 members: itself + a recruiter + a hiring manager), audit log (a few real events pre-seeded so it's not empty on first look), billing & plan, company profile, consent view. This is the account for demoing CA1 (dashboard) and CA3 (audit log) — the sales-pitch surface. |
| Recruiter | `demo.recruiter@vikisol.dev` | Same tenant as the Company Admin above (Techolution), full recruiter workspace: postings, pipeline, Talent Universe search, interviews, messages — everything short of the admin console itself. |
| Hiring Manager | `demo.hiringmanager@vikisol.dev` | Lite workspace: lands directly on "My interviews," no pipeline/search/postings access (by design — verify this restriction holds). Has at least one interview assigned already. |
| Platform Admin | `admin@vikisol.dev` | Internal console at `/admin`: 10 tenants, 53 users, cross-tenant activity feed, moderation queue, analytics, feature flags. Confirm a non-platform-admin session gets a real 404 here, not a redirect (see DECISIONS.md's PA7 note). |

## What's already seeded

The demo tenant ("Techolution") has real data behind it, not empty screens: multiple job
postings, ~30 candidate profiles across industries, applications at various pipeline stages,
a couple of scheduled/completed interviews, marketplace projects with bids, and a handful of
real audit-log entries (a stage move, a candidate unlock, the credit spend that came with it)
so the audit log and platform dashboard aren't blank on first look.

## A bug this deployment surfaced and fixed

Worth knowing: the first two deploy attempts to this staging environment silently seeded
almost none of the above — a genuinely fresh database is something local dev never exercised
(it always ran against an already-populated Postgres from earlier in this project's history).
`DataSeeder`'s "is this DB already seeded" check was tripped by an unrelated seeding step
(`RoleMigration`, which always creates exactly the platform admin account regardless), so the
rich demo data never ran. Fixed and verified live before this file was written — see
DECISIONS.md and the `arena-api` git log (`cbf3015`, `a73933d`) for the full story.

## Re-seeding from scratch

If you need a genuinely clean slate: connect to the Railway Postgres service and drop/recreate
the `railway` database, then redeploy `arena-api` (Flyway + `DataSeeder` both run automatically
on boot against an empty schema). `arena-api/scripts/backup-db.sh` / `restore-db.sh` can back up
the current state first if you want to be able to come back to it.
