# Vikisol Arena — Frontend (v0.1-fe-complete)

Arena is a Talent Operating System: a 24/7 AI agent that finds openings, applies with a
tailored resume, books interviews, and executes actions with your consent. This repo is the
**frontend only**, built end-to-end against realistic mock data, per `ARENA-FE-MISSION.md` and
`ARENA-FE-MISSION-ADDENDUM.md`. No backend exists yet — see [Mock data layer](#mock-data-layer)
for how that's structured to make the eventual swap a clean adapter change, not a rewrite.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/auth` with **any** email and
password — auth is fully mocked. Pick **Talent** or **Enterprise** to choose which app you land
in; each has its own onboarding flow the first time.

Press **⌘K / Ctrl+K** anywhere in the app to jump to any screen, search jobs, or ask the agent.

## Screen inventory

**Public**
- `/` — Landing page (agent orb hero, overnight report, Talent Universe, open market, CTA)
- `/auth` — Sign in / sign up, Talent vs. Enterprise role choice
- `/pricing` — Talent Free/Pro tiers, per-seat Enterprise tier
- 404 (any unmatched route) — branded, agent-orb-themed not-found page

**Talent app** (sidebar shell)
- `/onboarding` — Netflix-style one-question-per-screen wizard (persona → skills → experience →
  rate → availability → consent), skill picker grows a particle nebula as you add skills
- `/dashboard` — stat cards, SVG identity-graph radar (derived from real profile stats), top
  matches, live "while you slept" activity feed
- `/discover` — swipeable job card stack (GSAP Draggable + physics, button fallbacks), filters
- `/jobs/[id]` — job detail: match-score breakdown (matched/missing skills, salary/location fit)
- `/agent` — chat with typewriter replies, executable approval cards (apply / place bid), an
  Agent Journal tab, orb state (idle/thinking/acting/needs-approval)
- `/identity` — hand-rolled force-directed graph of your skills, click to focus, edit mode
- `/applications` — kanban pipeline (Applied → Screening → Interview → Offer/Rejected), interview
  scheduler with a GSAP lock-in animation on confirm
- `/applications/[id]` — timeline, agent's rationale, and **the tailored resume it submitted**
  (doc-styled, skills reordered/highlighted against this specific job), withdraw action
- `/marketplace` — browse projects, agent-assisted post-a-project (one-liner → drafted brief)
- `/marketplace/[id]` — live bid list with countdown, place-a-bid
- `/marketplace/[id]/manage` — poster's view: compare bids, award, milestone checklist
- `/marketplace/bids` — your bid history with status
- `/messages` — inbox (shared component, see below)
- `/settings` — autonomy dial (manual/supervised/**autopilot** — genuinely changes agent
  behavior, not just a stored preference), consent toggles, reduced-motion override,
  notifications

**Enterprise app** (top-nav shell, distinct from the talent sidebar)
- `/enterprise/onboarding` — company profile setup
- `/enterprise/dashboard` — postings, applicants, shortlist, unlock credits, seat/plan usage
- `/enterprise/talent` — Talent Universe search (reuses the landing page's starfield), only
  candidates who consented to `searchableByEnterprises`
- `/enterprise/talent/[id]` — consent-respecting unlock flow (contact stays hidden until an
  unlock credit is spent), then a Message CTA
- `/enterprise/postings` — agent-assisted job posting, same draft pattern as the marketplace
- `/enterprise/postings/[id]` — applicant pipeline (auto-seeded on posting creation), kanban
  with advance/reject
- `/enterprise/messages` — same shared inbox as the talent side

## Mock data layer

- `src/lib/types.ts` — the full type contract. When a real API exists, only the bodies of
  `src/lib/api/*.ts` functions change; call sites don't.
- `src/lib/mock/` — deterministic seed data (mulberry32 PRNG, stable across reloads): 40
  candidates, 30 jobs, 10 projects with bids, activity events, notifications, conversations.
  Indian context throughout (names, cities, ₹ figures), industries beyond tech (design, sales,
  healthcare, logistics) per the "not an IT-only platform" requirement.
- `src/lib/api/` — one module per domain (`profile`, `jobs`, `applications`, `interviews`,
  `market`, `myBids`, `myProjects`, `enterprise`, `messages`, `notifications`, `auth`),
  each wrapping mock data in an artificial delay so it behaves like a real async API today.
- Most mutable state is localStorage-backed (applications, bids, postings, conversations,
  profile edits) so actions genuinely persist across screens and reloads within a browser —
  not just component state that resets on navigation.
- `src/lib/realtime.ts` — a ref-counted simulated event channel; periodically emits fresh agent
  activity, and approving an intent card or swiping right emits into it immediately, so the
  Dashboard feed and Agent Journal update live without a real backend push mechanism.

## Design system

- Tailwind v4 (CSS-first `@theme`), shadcn/ui (Base UI-backed primitives, not Radix), tokens
  ported from `arena-prototype.html`: dark glass background, orange gradient accent, pill
  buttons + 24px card corners as two deliberately separate radius languages.
- **GSAP + ScrollTrigger + Draggable/InertiaPlugin only** for motion — no Framer Motion, per
  `CLAUDE.md`. `@gsap/react`'s `useGSAP` handles scoping/cleanup.
- `useReducedMotion()` (`src/hooks/use-reduced-motion.ts`) ORs the OS-level
  `prefers-reduced-motion` with a manual override from Settings, broadcast live via a custom
  event so already-mounted animations pick it up without a reload.
- Fonts: Space Grotesk (display), Inter (body), Manrope (labels) via `next/font/google`.

## What's honestly out of scope here

- No real backend, database, or auth — everything above is mock/localStorage by design (this is
  the frontend-first phase; see `ARENA-FE-MISSION.md`).
- No real-time chat/notifications infra — the "realtime" feed is a client-side interval emitter.
- No payment processing on `/pricing` — "checkout" flips a plan flag, nothing is charged.
- Route transitions are a lightweight top progress bar (GSAP), not full page-content transitions.
