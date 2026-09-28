# Vikisol Arena — Frontend

Arena is a living local network: real people, real needs, nearby activities, projects and work,
with Jenny (JennySol) as an active AI layer that drafts, explains and automates — always with
explicit human approval before anything consequential happens.

This repo is the Arena frontend (Next.js + TypeScript + Tailwind + shadcn/ui). The backend is
`Vikisol-Arena-BE` (Spring Boot, separate repo).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-in uses the real backend's auth — there
are no built-in demo credentials; ask the team for a test account.

## Documentation

Read `CLAUDE.md` / `AGENTS.md` first — they define the authority order for everything below:

- `docs/VIKISOL-MASTER-CONTEXT.md` — the ecosystem and the founder's standing rules.
- `docs/missions/FE-BPLUS-BUILD.md` — the active frontend mission (design is final).
- `docs/design/BPLUS-SCREENS.md`, `docs/design/TOKENS.md`, `docs/design/DECISIONS.md` — the
  screen-by-screen spec, design tokens, and a log of design decisions made along the way.
- `docs/ARENA-MISSION.md` — the product mission.
- `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md` — the security boundary and Jenny's live contract.
- `docs/PROGRESS.md` — current status; resume from here.
- `docs/FE-API-GAPS.md` — endpoints the frontend needs that the backend doesn't have yet.

## Stack notes

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui (Base UI-backed primitives).
- Motion via the `motion` package (Framer Motion's successor).
- `src/lib/data/` holds one typed interface per domain; an `api` implementation calls the real
  backend, a `fixtures` implementation covers preview-only gaps (see `docs/FE-API-GAPS.md`).
