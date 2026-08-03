# E2E-STATUS.md — Arena Final Sprint Walkthrough

Tracks every step of ARENA-FINAL-SPRINT.md's end-to-end walkthrough in both modes.
Legend: ❌ not verified/broken · 🟡 partial · ✅ verified working · N/A not applicable to this mode.

This file is the resume point if a session restarts mid-run: find the first ❌/🟡 row and continue there.

## A. Visitor (public)

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| A1 | Landing loads <3s, orb hero animates, nav/CTAs route correctly | ✅ | ❌ | Verified repeatedly through Phase 2 |
| A2 | Pricing: Free/Pro + Enterprise seats, every CTA leads somewhere real | ✅ | ❌ | Monetization-gating commit |
| A3 | Unknown URL → branded 404 with working home/dashboard buttons | ✅ | ❌ | Built in FE mission final pass |
| A4 | Auth: sign up/in, validation, role choice, correct routing | ✅ | ❌ | Real mode needs JWT persistence + reload survival |

## B. Candidate journey

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| B1 | Onboarding end-to-end, resumable if abandoned | ✅ | ❌ | |
| B2 | Dashboard: numbers agree, feed streams, Career Health orb, top matches | ✅ | ❌ | |
| B3 | Resume: upload → parse → review → confirm → CV → PDF export | ✅ | ❌ | Mock parse is simulated by design |
| B4 | Discover: swipe right/left/up, filters, 3D tilt, empty state | ✅ | ❌ | |
| B5 | Job detail: deep-linkable, match breakdown, apply/ask-agent | ✅ | ❌ | |
| B6 | Application detail: timeline, tailored CV diff, withdraw, PDF | ✅ | ❌ | |
| B7 | Agent chat: approval cards mutate state, Autopilot gated by plan | ✅ | ❌ | |
| B8 | Interviews: propose→confirm→room→recruiter feedback moves stage | ✅ | ❌ | |
| B9 | Messages: threads, persistence, inbound replies, agent-drafted reply | ✅ | ❌ | |
| B10 | Notifications: every event lands, links resolve, mark-read | ✅ | ❌ | |
| B11 | Settings: autonomy dial, consent toggles remove from search, reduced-fx | ✅ | ❌ | |
| B12 | Plan upgrade Free→Pro unlocks Autopilot immediately | ✅ | ❌ | |

## C. Enterprise journey

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| C1 | Enterprise onboarding → dashboard with truthful counts | ✅ | ❌ | |
| C2 | Post a job: draft→edit→publish, plan limits enforced, pause/close | ✅ | ❌ | |
| C3 | Pipeline: direct applicants free, stage moves reflect on candidate side | ✅ | ❌ | Same record two views since unification commit |
| C4 | Talent Universe: re-clustering, consent filter, credit-gated unlock | ✅ | ❌ | |
| C5 | Interview from pipeline → same room → feedback → pipeline | ✅ | ❌ | |
| C6 | Seats/plan page reflects usage and gates correctly | 🟡 | ❌ | Seats displayed, no invite-teammate surface exists to gate — noted in monetization commit |

## D. Project poster

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| D1 | Post project (agent-assisted draft) → preview → publish | ✅ | ❌ | |
| D2 | Bids arrive, animate in, agent-pick highlight, compare | ✅ | ❌ | |
| D3 | Award → project moves to awarded; losing bidders notified | 🟡 | ❌ | Award works; "losing bidders notified" not yet verified |
| D4 | Milestones 30/40/30 → deliverable → accept per tranche → complete → rating | ✅ | ❌ | |

## E. Bidder

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| E1 | Browse/filter projects, place bid, My Bids shows pending | ✅ | ❌ | |
| E2 | Bidding window closes → resolves won/lost, never stuck pending | ✅ | ❌ | resolveMyBids() |
| E3 | Won: milestone flow from bidder's side; rating updates reputation | 🟡 | ❌ | Rating feeds Career Health bump; no separate bidder-side milestone UI (single-user mock constraint, documented in bidding-lifecycle commit) |

## F. Cross-cutting

| # | Step | Mock | Real | Notes |
|---|------|------|------|-------|
| F1 | ⌘K palette: jump/search/ask, no crashes | ✅ | ❌ | |
| F2 | Data coherence across dashboard/application/pipeline/messages/notifications | 🟡 | ❌ | Application/Applicant unified; full cross-screen trace not yet walked end-to-end |
| F3 | 3D presence + reduced-motion fallbacks, no console errors | ✅ | ❌ | Phase 2 |
| F4 | Mobile 390px: no clipping, drawers usable, touch swipe | ✅ | ❌ | |
| F5 | Loading/empty/error states everywhere; real-mode API-down degrades gracefully | 🟡 | ❌ | Loading/empty states done in mock; error-path UI for a stopped API not yet built |

## Phase 4 wiring checklist (src/lib/api/*)

| Module | Real HTTP impl | Notes |
|---|---|---|
| auth | ❌ | |
| profile | ❌ | incl. resume upload |
| jobs | ❌ | |
| activity | ❌ | |
| applications | ❌ | |
| interviews | ❌ | |
| market (projects/bids/milestones) | ❌ | |
| myBids | ❌ | |
| myProjects | ❌ | |
| enterprise | ❌ | |
| shortlist | ❌ | |
| messages | ❌ | |
| notifications | ❌ | |

## Phase 5 scaffolding

| Item | Status |
|---|---|
| Email (Resend) provider interface + Noop | ❌ |
| WhatsApp Business provider interface + Noop | ❌ |
| Teams/Graph meeting-link provider interface + Noop | ❌ |
| Feature flags wired at fire points (welcome, application updates, interview confirm/reminder) | ❌ |
| Required keys listed in BLOCKED.md | ❌ |

## Release gate

- [ ] Every row above ✅ in both mock and real
- [ ] Zero console errors (both modes)
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Mobile (390px) verified
- [ ] Reduced-motion verified
- [ ] `v1.0-rc` tagged
