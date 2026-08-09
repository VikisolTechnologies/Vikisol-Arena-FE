# ROUTES.md — the v3 route contract (ARENA-MASTER-ARCHITECTURE.md PART 2)

Tracks every route the master spec requires, against what actually exists. Updated as the
rewrite proceeds — this is a live sweep record, not a one-time snapshot. `EXISTS` means the
route renders and is wired into real navigation; `TODO` means not built yet under the v3
route map (the old route may still exist pre-migration — see the Migration column).

Legend: ✅ done and verified · 🚧 in progress · ⬜ not started · ➡️ redirects to new route

## Public (no auth)

| Route | Status | Migration note |
|---|---|---|
| `/` | 🚧 | exists today (dark landing) — needs PART 7.1 content rewrite, kill list applied |
| `/how-it-works` | ⬜ | new |
| `/for-companies` | ⬜ | new |
| `/pricing` | 🚧 | exists today — needs plan/copy rework to PART 7.2 |
| `/discover` | 🚧 | exists today — needs faceted rebuild to PART 7.8 |
| `/p/[postId]` | ⬜ | new public permalink; today's `/feed/[id]` is auth-only |
| `/people/[handle]` | 🚧 | exists as `/people/[id]` (uses id not handle — handle field doesn't exist on `users` yet, see PART 5 note below) |
| `/company/[handle]` | 🚧 | exists as `/companies/[id]` — same handle-vs-id gap |
| `/legal/privacy` `/legal/terms` `/legal/acceptable-use` `/legal/cookies` | 🚧 | exist today as `/privacy` `/terms` `/aup` — need path move + a 4th (cookies) page |
| `/auth` | 🚧 | exists — needs Individual/Company-only signup per PART 7.3, delete role chips |
| `/auth/invite/[token]` | 🚧 | exists as `/invite/[token]` — needs path move |
| `/auth/forgot` `/auth/reset/[token]` | ⬜ | new — no forgot-password flow exists at all today |
| `*` branded 404 | 🚧 | exists — needs re-materialled orb per design system §9 |

## Authenticated — consumer

| Route | Status | Migration note |
|---|---|---|
| `/home` | ⬜ | new — today's default is `/feed`; `/dashboard` also exists and is being fully retired |
| `/onboarding` | 🚧 | exists — needs the 8-step rebuild in PART 7.4 |
| `/discover` | 🚧 | shared with public — auth adds actions |
| `/map` | 🚧 | exists today but is NOT a real map (no MapLibre) — full rebuild per PART 7.9 |
| `/post/new` + modal | ⬜ | new unified composer; today's `PostComposer` only covers ACTIVITY/ASK/UPDATE, not JOB/PROJECT/FREELANCE |
| `/p/[postId]` (auth view) | ⬜ | new |
| `/inbox` `/inbox/[id]` | ⬜ | new — merges today's separate `/rooms` and `/messages` |
| `/work` overview | 🚧 | exists today as a link hub, not a command centre — needs PART 7.11 rebuild |
| `/work/applications` `/work/applications/[id]` | 🚧 | exist today as `/applications` — path move + rebuild |
| `/work/bids` | 🚧 | exists as `/marketplace/bids` — path move |
| `/work/projects` `/work/projects/[id]` | 🚧 | exist as `/marketplace` `/marketplace/[id]` — path move |
| `/work/interviews` `/work/interviews/[id]` | 🚧 | exist as `/interviews` `/interviews/[applicationId]` — path move |
| `/work/saved` | ⬜ | new — no save feature exists at all today |
| `/me` `/me/edit` `/me/resume` | 🚧 | exists as `/identity` — path move + rebuild to PART 7.12 |
| `/people/[handle]` | see above | |
| `/notifications` | 🚧 | backend exists, page needs PART 7.14 rebuild (grouping, filters) |
| `/settings` | 🚧 | exists — needs tab rebuild to PART 7.15 (location/privacy/security tabs are new) |

## Company workspace (COMPANY_ADMIN, RECRUITER)

| Route | Status | Migration note |
|---|---|---|
| `/company/[handle]` | see above | |
| `/workspace` | ⬜ | new — today's `/enterprise/dashboard` is the closest analogue |
| `/workspace/posts` `/workspace/posts/new` | ⬜ | new — exists as `/enterprise/posts` (company-post-only, no promote/banner types) |
| `/workspace/jobs` `/workspace/jobs/[id]` | 🚧 | exist as `/enterprise/postings` — path move |
| `/workspace/pipeline` `/workspace/pipeline/[jobId]` | ⬜ | new Kanban — no pipeline board UI exists today (stage changes happen via applicant list) |
| `/workspace/talent` `/workspace/talent/[candidateId]` | 🚧 | exist as `/enterprise/talent` — path move |
| `/workspace/shortlists` | ⬜ | new |
| `/workspace/interviews` | 🚧 | exists as `/enterprise/interviews` — path move |
| `/workspace/inbox` | ⬜ | new — folds into the unified inbox, company-scoped view |
| `/workspace/analytics` | ⬜ | new |
| `/workspace/promotions` | ⬜ | new — no promotions/ads system exists today at all |
| `/workspace/team` | 🚧 | exists as `/enterprise/admin/team` — path move |
| `/workspace/billing` | 🚧 | exists as `/enterprise/admin/billing` — path move |
| `/workspace/audit` | 🚧 | exists as `/enterprise/admin/audit` — path move |
| `/workspace/settings` | 🚧 | exists as `/enterprise/admin/company` — path move |

## Hiring manager

| Route | Status | Migration note |
|---|---|---|
| `/hm/interviews` `/hm/interviews/[id]` | ⬜ | new dedicated HM surface — today HM shares the general `/interviews` route |

## Platform admin

| Route | Status | Migration note |
|---|---|---|
| `/admin` `/admin/tenants` `/admin/tenants/[id]` `/admin/users` `/admin/moderation` `/admin/analytics` `/admin/flags` | 🚧 | all exist today — need light-theme-with-slate-accent restyle |
| `/admin/promotions` | ⬜ | new |

## Deleted / redirected

| Old route | Action |
|---|---|
| `/dashboard` | delete — was already non-primary since the Phase A nav reposition, now fully retired in favor of `/home` |
| `/rooms` `/rooms/[id]` | ➡️ permanent redirect into `/inbox` |
| `/messages` `/messages/[id]` | ➡️ permanent redirect into `/inbox` |
| `/feed` `/feed/[id]` | ➡️ redirect to `/home` / `/p/[id]` |
| `/identity` | ➡️ redirect to `/me` |
| `/enterprise/*` | ➡️ redirect to `/workspace/*` equivalents per the table above |

## Known PART 5 data-model gap this exposes

The spec's `users` table has a unique `handle` — **no such field exists today** (current
`User`/`CandidateProfile` entities key public URLs off the raw UUID `id`). Adding `handle`
(unique, user-chosen or auto-generated from name, changeable in `/me/edit`) is part of
Step 1/3's migration work, not deferred — every public URL in PART 2 depends on it.
