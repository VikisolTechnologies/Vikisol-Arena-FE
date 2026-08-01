# ARENA-FE-MISSION.md — Build the ENTIRE frontend, end to end

> This file supersedes the phase ordering in CLAUDE.md. **Do NOT build any backend** —
> no NestJS, no Python agent service, no databases, no real APIs. Frontend only,
> powered by realistic dummy data. The backend comes later (it will follow the HRLMS
> approach) once the design is approved. Everything else in CLAUDE.md (design tokens,
> GSAP motion, shadcn, accessibility, quality-gated agent philosophy) still applies.

## Objective
Complete the full Arena user experience in `arena-web` so every flow can be clicked
end-to-end in the browser with zero real services. When done, a visitor should be able
to: land → sign up → onboard → watch their agent "work" → swipe jobs → chat with the
agent → view their identity graph → post a project → receive bids → schedule an
interview → and switch to an enterprise account to search the Talent Universe.

## Mock data layer (build this FIRST)
- `src/lib/api/` — a typed client whose function signatures mirror the future REST/GraphQL
  API (getMatches, applyToJob, getAgentActivity, searchTalent, placeBid, …). Today each
  function resolves mock data with a small artificial delay; later we swap the adapter
  for real HTTP. Keep all types in `src/lib/types.ts` as the future API contract.
- `src/lib/mock/` — rich seed data: ~40 candidates, ~30 jobs (mixed industries: IT,
  design, sales, healthcare, logistics — not just tech), ~10 projects with bids, agent
  activity events, notifications. Indian context: Indian names, Hyderabad/Bengaluru/
  remote locations, ₹ salaries/budgets.
- Simulated realtime: a lightweight event emitter that periodically pushes fake agent
  events ("Applied to X", "Found 2 matches", "Interview slot proposed") so the app
  feels alive. Persist session state (user, swipes, approvals) in localStorage.

## Screens to build — in this order, one commit each
1. **Auth** — split-screen sign in / sign up (mock: any credentials work). Role choice:
   Talent or Enterprise.
2. **Onboarding** — one question per screen (Netflix style): name → what do you do →
   command-palette (⌘K-style) skill picker with fuzzy search → experience → salary/rate
   floor → open-to (contract / full-time / projects) → finale: the agent orb "wakes up",
   explains what it will do, and captures explicit consent toggles (auto-apply,
   searchable-by-enterprises). Skill choices grow a background particle nebula.
3. **Candidate dashboard** — "While you slept" agent activity feed (streams via the
   fake realtime emitter, expandable items with rationale + undo), Career Health score,
   skill radar (canvas/SVG), today's top matches rail.
4. **Agent chat** — dockable panel + full page: streaming-style replies (typewriter),
   executable intents rendered as approval cards (Apply, Create job, Place bid) that
   actually mutate mock state, plus an "Agent Journal" timeline tab of everything it
   did autonomously. Orb states: idle / thinking / acting / needs-approval.
5. **Opportunity discovery** — swipeable job card stack (drag physics, GSAP): right =
   agent applies (goes to feed), left = pass, up = "tell me more" opens agent chat with
   that job in context. Filters drawer.
6. **Identity / profile** — interactive talent graph (2D canvas force-graph is fine —
   user at center, skill/experience/project nodes; click to focus + edit panel below).
   Public view + edit mode.
7. **Applications & interviews** — pipeline board (applied → screening → interview →
   offer), interview scheduler where the agent proposes 3 slots and one tap confirms,
   with a confirmation "lock-in" animation.
8. **Projects marketplace** — browse grid, project detail with live bid list (countdown,
   bids animate in from the emitter, "agent pick" highlighting), place-a-bid sheet, and
   an agent-assisted post-a-project form (one-line description → agent drafts the full
   brief into the fields, live card preview).
9. **Enterprise portal** (separate layout after enterprise login) — Talent Universe:
   natural-language search bar over the starfield, results as candidate cards (match %,
   availability, agent-written fit blurb — pre-written strings in mock data), filters
   rail, candidate detail with consent-respecting contact/unlock flow, saved shortlists,
   simple seat/plan indicator.
10. **Notifications + settings** — unified activity feed; settings with the autonomy
    dial (manual / supervised / autopilot — changes how approval cards behave), consent
    toggles, reduced-effects toggle.

## Working method (you have full permissions — do not stop to ask)
- Work strictly in the order above; finish + verify + commit each screen before the next.
  Conventional commit messages (feat: onboarding flow).
- Never ask for confirmation on edits, installs, or commands within this repo. Only stop
  if something is truly destructive outside this repo.
- Verify each screen in a real browser at 1440px and 390px AND with prefers-reduced-motion:
  zero console errors, clean lint, clean `next build`. Fix what you find before committing.
- Reuse the established tokens/components; landing page (already built) is the visual
  benchmark. Pill buttons, 24px glass cards, orange gradient accents, Space Grotesk /
  Inter / Manrope, GSAP + ScrollTrigger for motion.
- Every list needs loading, empty, and error states. Keyboard + ARIA on all interactions.
- When all 10 are done: a final pass — route transitions, a shared app shell (sidebar/
  bottom-tab nav for candidate, top-nav for enterprise), favicon + metadata, README with
  screen inventory, then a `v0.1-fe-complete` git tag.
