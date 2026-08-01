# CLAUDE.md — Vikisol Arena

## What this project is
Arena is a **Talent Operating System** by Vikisol Technologies (Hyderabad) — not a job board.
- A 24/7 **AI agent** finds jobs, applies with tailored resumes, books interviews, answers anything, and executes actions (create job, place bid, update profile) — always with user consent/approval.
- **Marketplace**: people post skills/profiles ("open to work"), post projects others bid on; covers ALL industries, not just IT; contract + full-time.
- **Enterprise**: companies buy DB access and search consented candidates from their own login ("Talent Universe").
- Web (Next.js) + Mobile (React Native/Expo). Immersive-but-tiered 3D.

## Design system (source of truth: arena-prototype.html in repo root)
- Direction: **"The Companion"** hero (living agent orb with eyes/orbits/activity chips) + **"Talent Universe"** enterprise starfield.
- Dark premium glassmorphism: bg `#09090B`, glass `rgba(255,255,255,.05)` + border `rgba(255,255,255,.12)` + `backdrop-blur(18px)`, radius `24px`.
- Accent gradient: `#FF8A5B → #FF6B35` (Vikisol orange), on-accent text `#160a05`.
- Type: Space Grotesk (display), Inter (body), Manrope (UI labels).
- Motion: **GSAP + ScrollTrigger** (hero timeline, scroll reveals, count-ups, floating orb, blinking eyes, starfield canvas). Respect `prefers-reduced-motion`. 3D/heavy effects must have a 2D fallback and device tiering (mobile ≥30fps).
- Components: **shadcn/ui** styled with the tokens above. Pull premium blocks via the 21st.dev Magic MCP when available.

## Tech stack
- Web: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + GSAP + React Three Fiber (hero moments only).
- Backend: modular monolith (NestJS/TypeScript), GraphQL for app + REST/webhooks for integrations.
- Data: PostgreSQL + pgvector (matching) + RLS multi-tenancy for enterprise; Redis; Typesense for faceted search; S3 for files.
- Agent service: Python, LangGraph-style orchestration, tool calling, queue workers; supervised mode first (user approves each application); API-first job connectors before any browser automation.
- Payments: Razorpay Route (India marketplace/escrow). Calendars: Nylas or Cal.com.
- Privacy: India DPDP Act — explicit, purpose-scoped, revocable consent for (a) agent auto-actions and (b) inclusion in the enterprise-searchable pool. Never skip consent capture.

## Build order (work phase by phase; don't jump ahead)
1. **Phase 0**: Next.js scaffold, design tokens + glass components, landing page (port arena-prototype.html into components), auth, profile data model, consent capture.
2. **Phase 1**: candidate dashboard ("while you slept" agent feed), matching engine (embeddings + hybrid search), swipe job discovery, agent chat (converse + execute w/ approval cards), interview scheduling, notifications (WebSocket).
3. **Phase 2**: project posting + bidding (Razorpay escrow), enterprise Talent Universe search, multi-tenancy/seats/RBAC, autonomy dial.
4. **Phase 3**: scale-out (extract agent/search services), mobile app, WebGPU polish.

## Rules for Claude Code
- Match arena-prototype.html's look exactly when building UI; it is the approved design.
- Prefer plan mode for multi-file changes; small commits per feature.
- Quality-gated agent philosophy: never build spam/volume auto-apply; matches ≥ threshold + user approval.
- TypeScript strict; accessible (keyboard, ARIA, reduced-motion); mobile-first responsive.

## Repo notes
- This repo (`arena-web`) is the Next.js frontend only, with its own dedicated git repository — intentionally **not** nested inside any other repo. Backend (`arena-api`, NestJS) and the Python agent service will be separate repos created when their phases start.
- `arena-prototype.html` in this repo root is the approved static reference design; it is not served or built, purely a visual source of truth while porting.
