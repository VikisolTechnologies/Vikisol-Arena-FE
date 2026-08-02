# AUDIT.md — Arena Founder-Lens Audit (Phase 1)

Written against `arena-web` at tag `v0.1-fe-complete` (commits `219826c`..`0ee411f`) and
`HRLMS-BE` at commit `247ec61` on `main`. This is the reference document for Phases 2–6 of
`ARENA-PRODUCTION-MISSION.md` — read this instead of re-reading the whole repo each session.

---

## 1. The single most important finding: Arena is already load-bearing in HRLMS-BE

`HRLMS-BE/src/main/resources/application.yml` already has a live, working webhook:

```
POST /api/v1/assessments/webhook
Header: X-API-Key: ${ARENA_WEBHOOK_API_KEY}
Body (AssessmentWebhookRequest): arenaSubmissionId, candidateName, candidateEmail,
  candidatePhone, yearsOfExperience, techStack, resumeUrl, testName, dateTaken, score, maxScore
```

`AssessmentController.ingestResult()` is real, tested-shape code — `permitAll` in
`SecurityConfig` with the API key checked in the handler (comment: *"Arena is a separate deployed
app with no HRLMS user session, so auth is enforced here instead"*). A `RECRUITER`/`HR_MANAGER`
can then call `POST /assessments/{id}/move-to-interview`, which presumably lands the candidate in
HRLMS's own `recruitment` module (`Candidate`, `Interview`, `JobPosting` entities — a full internal
ATS already exists there, independent of Arena).

**Arena today has zero concept of a skills test/assessment anywhere** — not in `types.ts`, not in
any screen. Someone (a past session, or Syam directly) already scoped and half-built the *receiving
end* of a "candidate takes a test on Arena → score flows into Vikisol's internal hiring pipeline"
feature, and the *sending end* was never built. This is either:
- **(a)** in-scope and just hasn't reached this phase yet — Arena needs a skills-assessment
  screen/flow that POSTs to this exact contract, or
- **(b)** vestigial scaffolding from an earlier plan that's no longer live.

I'm not assuming which — **this is the first thing to resolve in the access-request reply.** If
(a), it's a real Phase 3/4 feature with an exact contract already waiting; if (b), the webhook can
stay dormant indefinitely (it's harmless either way, `permitAll` + API-key gated).

---

## 2. HRLMS-BE stack (confirmed by direct inspection, not assumption)

- **Spring Boot 3.3.0, Java 21**, Maven. Package-per-domain: `com.vikisol.one.<module>.{controller,dto,entity,repository,service}`, shared `common.dto.ApiResponse<T>` envelope and `common.entity.BaseEntity`.
- **PostgreSQL** (Hibernate `ddl-auto: update`, no migration tool like Flyway/Liquibase in evidence — schema evolves via entity changes directly).
- **Auth**: JWT (`jjwt` 0.12.6), MFA via TOTP (`dev.samstevens.totp` + zxing QR), session timeout is CEO-configurable at runtime (default 15 min access token, 12h/30d refresh).
- **File storage**: Cloudinary (`cloudinary-http44`) — chosen explicitly because *"Railway's local disk is ephemeral and wipes on every redeploy"* (their words, in a pom.xml comment). Same constraint will apply to Arena's CV uploads.
- **API versioning**: `context-path: /api/v1`, explicitly reserving room for a `/api/v2` without breaking existing clients.
- **Deploy**: Railway, `Dockerfile` + `railway.toml`, healthcheck at `/api/v1/actuator/health`, `ON_FAILURE` restart policy, 3 retries.
- **Mail**: Gmail SMTP via `spring-boot-starter-mail`.
- **Integrations module already has the exact pattern Phase 5 asks for**: `integration.provider` defines `CalendarProvider`/`MeetingProvider`/`MailProvider`/`IdentityProvider` interfaces, each with a `Noop*Provider` fallback and one real implementation (`Microsoft365Provider` — OAuth2 client-credentials against Microsoft Graph, does Teams meetings + calendar + mail in one class since Graph's `isOnlineMeeting=true` event call *is* the Teams meeting). Its own doc comment admits it's *"NOT independently verified against a live Azure tenant"* — untested but structurally sound. **Recommendation: mirror this exact provider-interface + Noop-fallback pattern for Arena's Phase 5 integrations rather than inventing a new one** — it's already proven out structurally and keeps both codebases consistent.
- **PDF generation**: `openhtmltopdf` renders branded offer letters — same library would work for Arena's CV export.
- API docs: springdoc-openapi at `/v3/api-docs` / `/swagger-ui.html`, disabled in prod (commit `d00a46a`).
- This is a **live, actively-developed, production system** — recent commits are real bug fixes and features (CSV bulk import, backup/restore, CSRF domain-scoping fixes), not scaffolding. Treat it with production care in Phase 6, not as a green-field rewrite target.

**HRLMS-FE stack** (the existing frontend Phase 6 will redesign): Vite + React 19, **plain JS/JSX,
not TypeScript**, `react-router-dom` v7, Tailwind v4, Framer Motion, Recharts, `oxlint`, deployed on
Vercel (`.vercel/`, `vercel.json`). No shadcn/ui. Phase 6 will need an explicit decision on whether
to introduce TypeScript during the redesign or keep it JS — noting it now so it isn't a surprise
later.

## 3. Git hygiene — the landmine is not where it was thought to be

The **real, live HRLMS-BE** is at `Desktop/HRLMS/HRLMS-BE` — it has its own clean git root, remote
`github.com/VikisolTechnologies/Vikisol-One-BE.git`, on `main`, working tree clean. **No landmine
here.**

The actual landmine is a **separate, stale duplicate** at `Desktop/HRMLS-BE/HRLMS-BE` (note: parent
folder name is a typo — `HRMLS-BE`, letters transposed). That folder has no `.git` of its own — it
resolves to `C:\Users\USER` as its git root, meaning it's untracked/exposed inside the Windows
profile-rooted mega-repo previously flagged. It contains only `.idea`/`.iml` files and looks like an
old IntelliJ checkout, not the deployed product. **I have not touched it.** Recommended fix in
Phase 6: confirm with you that it's dead, then delete the folder directly (not a git operation,
just a stale directory) rather than trying to "rescue" any git history from it — the real history
already lives safely in `Desktop/HRLMS/HRLMS-BE`.

---

## 4. Business-flow gaps by persona

### Candidate
- **No real CV artifact anywhere.** The profile is built entirely from onboarding wizard answers
  (`OnboardingProfile` in `session.ts`); the "tailored resume" on `applications/[id]` is synthesized
  from that profile data per-application, not derived from an uploaded file. Phase 3's "upload
  PDF/DOCX → parsed → standardized CV → export" is a from-scratch build, not a wire-up.
- **No skills verification.** Ties directly to finding #1 — no assessment/test concept exists in
  `types.ts` at all despite HRLMS-BE already expecting one.
- **One-directional pipeline.** Applications move through stages (`ApplicationStage`) but there's
  no structured employer feedback flowing back to the candidate beyond the stage label itself.
- Autonomy dial (manual/supervised/autopilot) is real and functional — genuinely changes agent
  auto-approval behavior in `agent/page.tsx`, not just a stored preference. One of the stronger
  flows as built.

### Recruiter / Enterprise
- **Talent Universe has no path forward on a non-consenting candidate.** Search only returns
  candidates with `searchableByEnterprises: true`; if a recruiter wants someone who hasn't opted
  in, there is no "request access" / invite-to-join flow — just a dead end.
- **No saved searches or alerts** on Talent Universe.
- **Unlock-credit exhaustion behavior is unverified** — I did not confirm what happens at 0
  credits (silent failure vs. inline upgrade prompt). Worth a real check during Phase 3 build, and
  exactly the kind of monetization touchpoint Phase 3 asks to gate for real.
- **No structured interview scorecards.** HRLMS-BE's own `recruitment` module already has an
  `InterviewFeedbackRequest` DTO as a working template for what this should look like — Arena's
  applications kanban only captures stage transitions (advance/reject), no structured feedback.

### Project poster / Bidder (Marketplace)
- Confirmed via `types.ts`: `Project.status` is only `"open" | "awarded" | "closed"` — **there is
  no `Milestone` type, no deliverable-submission concept, and no `Rating`/`Review` type anywhere in
  the contract.** The "milestone checklist" on `marketplace/[id]/manage` is UI-only state, not
  backed by the data model. This exactly matches what Phase 3 already names as missing (submit
  deliverable → accept → completion → two-way ratings) — flagging here with the precise proof
  (grep of `types.ts`) so Phase 3 knows it's a real data-model build, not a UI wire-up.

---

## 5. Data-coherence problems

- **No single source of truth for "match"/"health" scores.** Dashboard stat cards, the Identity
  force-graph, and job match percentages are each computed independently from mock data in their
  own screen rather than one shared derivation — real risk of the same candidate seeing different
  numbers in different places once real data varies (mock data is deterministic-seeded today, which
  currently hides this). Phase 3 explicitly names this as item one; confirming it's real.
- **Enterprise `Applicant` records vs. candidate `Application` records are two parallel models**,
  auto-seeded independently per posting (`enterprise.ts`) rather than being the same underlying
  record viewed from two sides. A real backend (Phase 4) must collapse these into one entity with
  two views, not keep them as separately-seeded mock lists — otherwise stage changes on one side
  won't reflect on the other, silently.

---

## 6. Recruiter-POV CV gaps

- No downloadable/printable file — `TailoredResume` renders in-browser only (confirmed: no export
  button, no PDF generation anywhere in the marketplace/applications code).
- No standalone canonical "Arena CV" independent of a specific application — every tailored resume
  is generated ad hoc per job; there's no profile-level CV view a recruiter could see on its own.
- Contact-redaction is implemented for Talent Universe search results specifically
  (`EnterpriseSearchResult`), but I did not re-verify whether the same redaction discipline is
  applied once a candidate applies directly to a posting via `enterprise/postings/[id]` — worth a
  direct check during the Phase 3 CV-system build rather than asserting it's missing.

---

## 7. Missing monetization touchpoints

- `pricing/page.tsx` "checkout" flips a plan flag — correctly out of scope for this phase per the
  mission (payments stay mocked through Phase 4), not a bug. Noting only so it isn't rediscovered
  as a surprise.
- **Nothing is actually gated by plan today.** Autonomy dial, unlock credits, and posting limits
  all currently behave as pure UI state with no plan-tier enforcement anywhere in the mock API
  layer. Phase 3 already names "monetization actually gating features in app logic" as a deliverable
  — confirming there is no partial implementation to build on; this is a clean-slate build.
- No referral/virality loop (candidate profile share link, enterprise teammate invite) — a plausible
  business-sense addition, flagged as a suggestion, not a confirmed gap.

---

## 8. Screen-by-screen 3D/design deficit list (current state → Phase 2 target)

| Screen | Current state | Phase 2 target |
|---|---|---|
| Landing hero (`AgentOrb.tsx`) | CSS/DOM orb: float + ring rotation + eye-blink loop, mouse-parallax tilt | Full 3D-shaded orb with real depth |
| App shell (all routes) | No persistent orb anywhere in `CandidateAppShell`/`EnterpriseAppShell` | New component: persistent mini-orb, idle/thinking/acting/needs-approval states |
| `/agent` | `AgentOrbAvatar` reuses the same 2D orb | Full reactive orb tied to chat/approval state |
| Dashboard | `SkillRadar` is a flat SVG radar chart | Glowing 3D-shaded orb/gauge for Career Health |
| `/identity` | Hand-rolled 2D canvas force graph (spring + repulsion), click-to-focus, edit mode | True interactive graph: drag nodes, focus-zoom, cluster glow |
| `/discover` | Real GSAP `Draggable`+`InertiaPlugin` swipe physics, flat 2D cards | Tilt-toward-cursor/gyroscope, depth-stacked deck |
| Talent Universe (landing + `/enterprise/talent`) | `Starfield.tsx` canvas, ambient/decorative only | Starfield re-clusters in response to live search query |
| Route transitions | `RouteTransition.tsx` — GSAP top progress bar only | (Mission doesn't require full page transitions — progress bar likely stays; noting current state for completeness) |
| Onboarding, bidding, general depth/parallax | Static glass cards, no scene depth | Nebula/parallax auras per mission's general ask |

Performance budget from the mission (60fps desktop / 30fps mobile, ~150MB GPU ceiling, lazy-loaded
canvases) applies to all of the above — none of the current implementations are GPU-heavy today
(no WebGL anywhere yet), so the budget is a forward constraint on Phase 2's build, not a fix to
existing overspend.

---

## 9. Founder lens

- **Revenue**: until Phase 3's monetization gating lands, Arena has **zero enforced revenue
  mechanism**, even in mock form — Free vs. Pro is cosmetic today.
- **Trust**: candidates have no visibility into *who* unlocked their profile or when — no audit
  trail on the candidate side of the enterprise-unlock flow. Worth adding given DPDP-Act-conscious
  positioning already stated in `CLAUDE.md`.
- **Business sense**: full-time/contract hiring-via-agent and project bidding are two structurally
  different products sharing one nav, with no cross-sell moment between them (a bidder is never
  nudged toward "let the agent also apply to full-time roles," and vice versa) — a plausible
  low-effort revenue lever worth a product decision, not a code gap.
- **The assessment-webhook seam (finding #1)** is the biggest open question in this entire audit —
  it's the one place where HRLMS-BE's own code makes a concrete claim about what Arena is supposed
  to do that Arena's current build doesn't do at all. Everything else here is a gap Arena's own
  mission already anticipates; this one wasn't on anyone's list until this audit found it.

---

## 10. What Phase 1 did *not* do

Per the mission's own cost-discipline instruction, this audit was written from direct knowledge of
`arena-web` (built end-to-end this session, every screen and data shape) plus **targeted** reads of
`HRLMS-BE` (`pom.xml`, `application.yml`, `application-prod.yml` reference, `recruitment` and
`assessment` and `integration` module file listings, `AssessmentWebhookRequest`/`AssessmentController`,
`Microsoft365Provider`, `.env.example`, `railway.toml`, git log) — not a full line-by-line read of
either repo. If a later phase needs more backend detail than is captured here, that's a targeted
follow-up read, not a re-audit.
