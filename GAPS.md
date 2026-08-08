# GAPS.md — ARENA-DEEP-AUDIT.md Phase 1.3 architecture conformance check

Re-verified against the specs (CLAUDE.md, ARENA-FE-MISSION.md, E2E-STATUS.md's persona
record for the enterprise suite — no standalone ARENA-ENTERPRISE-SUITE.md file exists,
it was apparently only ever pasted in chat) and the ACTUAL deployed code, 2026-08-09.
Nothing here is assumed from a prior checkbox — each line below was re-checked directly
(API call, grep, or code read) this pass.

## 1. CLAUDE.md tech-stack claims vs reality

CLAUDE.md's stated stack includes several items that were never actually built. These
are **deliberate, already-reasoned scope decisions from earlier passes** (see
DECISIONS.md), re-confirmed still true here, not new discoveries:

| Spec'd | Actual | Where documented |
|---|---|---|
| "PostgreSQL + pgvector (matching)" | Deterministic arithmetic (`ScoringService`: skill-overlap %, career-health formula) — zero ML/vector matching, zero `pgvector` extension or `vector` columns anywhere in the schema | Confirmed via migration grep; matches ARENA-SHIP-IT.md's own audit finding ("no live LLM/AI integration anywhere... 'the agent' is entirely ScoringService's deterministic arithmetic") |
| "RLS multi-tenancy for enterprise" | Application-level tenant isolation (`Membership`/`tenant_id` filtering in every query) + `scripts/idor-check.sh` as the live-verification mechanism, not database-enforced RLS | DECISIONS.md's ARENA-SHIP-IT.md entry: "deferred to a documented fast-follow... the concrete implementation plan is written down here so a future pass doesn't start from zero" |
| "Typesense for faceted search" | Plain Postgres `LIKE`-based JPQL query (`CandidateProfileRepository.search()`) | Confirmed via code read this pass |
| "S3 for files" | `LocalDiskFileStorageService` — Railway's ephemeral local disk, files lost on every redeploy | BLOCKED.md's standing note: "swapping in Cloudinary... before this environment needs to persist uploads across redeploys is a one-class change, not a redesign" |
| "Payments: Razorpay Route" | Not implemented anywhere — only string in the entire codebase is a seed-data company name flavor text | DECISIONS.md's ARENA-SHIP-IT.md entry, re-confirmed this pass (grepped for "Razorpay" again, same single seed-data hit) |
| "Python agent service" (separate microservice) | Never built — "the agent" is entirely arena-api's `ScoringService` + templated notification copy + arena-web's UI personification, no separate service, no LangGraph, no real LLM calls anywhere | Confirmed via directory listing — no `arena-agent`/Python service repo exists |

**Verdict**: none of these are bugs. They're the honest, pragmatic MVP-stage
simplification of an aspirational day-1 tech-stack list, and every one was already
reasoned through and documented in a prior pass. Restated here because Phase 1.3
explicitly asks to re-verify rather than trust old checkboxes, and because a reader of
CLAUDE.md alone (without also reading DECISIONS.md) would reasonably believe these were
built. If CLAUDE.md is meant to keep being the onboarding doc for this project, it's
worth a follow-up edit to mark these as "Phase 3+ / not yet built" rather than reading as
already-done infrastructure — a documentation gap, not a code one.

## 2. E2E-STATUS.md known gaps — re-verified

| Gap (as documented) | Still true? | Evidence this pass |
|---|---|---|
| `hasDirectlyApplied` has no backend equivalent, real mode always requires credit unlock | **Resolved — E2E-STATUS.md is stale on this point.** `TalentSearchService.getCandidateDetail()`'s own comment: "documented 'direct applicants are visible for free' model... previously mock-only, now real here too" — backend grants free access via `applicationRepository.existsByCandidateIdAndJobPostingEnterpriseId`. Needs a doc update, not a code fix. | Code read, `TalentSearchService.java` |
| No "losing bidders notified" on award | Still true | Not re-verified live this pass (would need placing + awarding a real bid); no notification call for losing bidders found in `ProjectService.award()` on re-read |
| Ratings not returned by `GET /marketplace/projects/{id}` | Still true | Direct API call this pass: `curl .../marketplace/projects/{id}` — no `rating`-shaped field in the response |
| `NotificationService` only notifies the tenant's founding admin, never fans out to all active members | Still true | Code read this pass: `notify(job.getEnterprise().getUser(), ...)` — singular `getUser()`, not a membership-list iteration |
| B12 (Free→Pro unlocking Autopilot) mock-only, no real payments | Still true, explicitly out of scope (see Razorpay row above) | — |
| C6 (seats/plan gating) | Resolved as of the enterprise suite — Team page (CA2/G2) is the real gating surface and does enforce seat limits. E2E-STATUS.md's own text already notes this ("now stale... Leaving this line for history") | — |

## 3. New gaps found this pass

- **CLAUDE.md documentation drift** (see section 1) — the tech-stack section reads as
  already-built infrastructure for pgvector/RLS/Typesense/S3/Razorpay/Python-agent-service,
  none of which exist. Recommend a follow-up doc-only commit marking these as roadmap
  items, not current architecture, so a new reader isn't misled. Not fixing in this pass
  (Phase 1 is diagnose-only) — flagged for Phase 2/6.
- **No shared `EmptyState` component** despite 14 files independently implementing empty-
  state UI, and **no shared card-wrapper component** despite 25 files repeating the same
  `"rounded-2xl border border-border bg-white..."` className by hand — real duplication,
  addressed in Phase 3 (component consolidation), not a Phase 1 defect.
- **No shared auth-guard hook** — 29 different page components each inline their own
  `getSession()` + `router.replace("/auth")` check instead of one shared hook (the one
  exception is `usePlatformAdminGate()`, built specifically for the PA7 404-not-403
  requirement). Addressed in Phase 3.
- Full interaction-sweep results (dead/broken buttons) pending — see BUGS.md, appended
  once the click-through pass completes.

## 4. Persona-by-persona spec conformance (ARENA-FE-MISSION.md's 10 screens)

All 10 screens from the original build-order spec are present and reachable in the
deployed app, confirmed via the Phase 1.1 route sweep (zero 404s, zero blank bodies
across all 41 routes): Auth, Onboarding, Candidate dashboard, Agent chat, Opportunity
discovery, Identity/profile, Applications & interviews, Projects marketplace, Enterprise
portal (Talent Universe), Notifications + settings. The enterprise-suite extension
(Company Admin, Hiring Manager, Platform Admin consoles) is also fully present and
reachable by its correct role, per the same sweep.

Whether every *individual interaction* within each screen still works as promised is the
interaction sweep's job (BUGS.md), not this architecture check's — this section confirms
the screens exist and route correctly, not that every button on them functions.
