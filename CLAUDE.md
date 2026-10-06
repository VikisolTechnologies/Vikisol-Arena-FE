# CLAUDE.md — Vikisol Arena

## Which documents are instructions (authority order)
1. `docs/VIKISOL-MASTER-CONTEXT.md`: the ecosystem, the founder's rules, decisions.
2. `docs/missions/FE-BPLUS-BUILD.md` + `docs/design/*` (`BPLUS-SCREENS.md`, `TOKENS.md`,
   `DECISIONS.md`, `boards/*`): the frontend mission and the design. **The design is final** —
   don't propose a different visual direction; extend or correct within it per the mission's §2.
   **`docs/design/ARENA-APP-FLOW.md`** sits beside the mission: the boards decide how screens
   look; the flow spec decides what the app does and asks (intake, missing screens, Arena for
   Business `/enterprise/*`, Arena Admin `/admin/*`, Jenny covers). Screens without a board are
   designed in B+ and marked "No board — designed in B+".
3. `docs/ARENA-MISSION.md`: the active mission and sequence.
4. `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md`: security boundary, the Jenny live-vs-proposed
   contract, automation safety, Gemini, branches and deployment.
5. `docs/PROGRESS.md`: where the last agent stopped. Resume from it; don't restart.

Also follow `docs/AGENT-COLLABORATION-PROTOCOL.md` (how agents work together) and
`docs/reviews/` (the architect's verdicts; the newest one governs its SHA).

**Anything not in this list doesn't exist as instruction.** The repo was cleaned on 28 Sep 2026
of superseded plans, reports and design docs (see `docs/PROGRESS.md` for the list) — there is no
remaining "historical evidence" tier; a doc either governs or has been deleted (git history keeps
it if ever needed).

## The short version
- **Arena** is a living network: NEED → RESPONSE → CONVERSATION → OUTCOME → IDENTITY.
- **Mobile bottom bar:** Feed · Discover · (+) · Work · You. Map is Discover's map mode. Jenny is
  contextual (Create sheet, Feed cards, header), never a primary tab. Inbox is in the signed-in
  header.
- **Brand:** warm graphite (`#16110F`) + cream paper (`#F7F0E6`) + orange (`#FF5A1F`) — see
  `docs/design/TOKENS.md` for the full palette. No literal hex in components.
- **Stack:** frontend on Next.js + TypeScript + Tailwind + shadcn (Vercel; see `AGENTS.md`);
  backend `Vikisol-Arena-BE` on Spring Boot 3.3 / Java 21 (Railway `arena-api`).
- **Jenny:** only through the JennySol gateway; the v1 contract is live and must not break. The
  demo flag is **`demoContent`**.
- **Rules:**
  - feature branches only;
  - never commit secrets;
  - never touch Vikisol One;
  - no fake data outside preview mode, and preview fixture data always carries a "Preview data"
    pill;
  - no real brand names or logos anywhere in the product (fictional companies only);
  - VNext goes only to the protected preview until the founder approves production.
