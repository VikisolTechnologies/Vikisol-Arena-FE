# Arena VNext Mobile + Jenny Active Layer — Blueprint (security, contract, deployment)

**Design authority: `docs/missions/FE-BPLUS-BUILD.md` and `docs/design/*`.**

**Architect:** Claude · Gate 0 completed 27 Sep 2026, 01:00 IST; trimmed to security/contract/
deployment content 28 Sep 2026 when the B+ boards became the design (old design decisions, the
reuse map and the mission table are superseded — see `docs/design/*` and
`docs/missions/FE-BPLUS-BUILD.md` for what replaced them).
**Authority:** fourth, after `VIKISOL-MASTER-CONTEXT.md`, the FE-BPLUS-BUILD mission + design docs,
and `ARENA-MISSION.md` (see `CLAUDE.md`).

## 1. Security boundary
`Arena mobile UI → Arena BE (BFF: auth, authorization, per-request scoped service token for the current user) → JennySol Agent Gateway → approved Arena tool endpoints → Arena DB`
- The frontend never calls JennySol and never receives raw model output.
- **READ:** within the granted scope.
- **WRITE:** propose → preview → approve → execute once → authoritative result → audit.
- No protected-attribute targeting. Approximate location only. Failures stay failures. No fabricated activity.

## 2. Jenny contract: LIVE vs PROPOSED
| Item | Status |
|---|---|
| `POST /api/agent/gateway/chat`, `POST /api/agent/gateway/actions/:actionId` | **LIVE** |
| Per-request scoped service tokens; Arena BFF `AgentController` (`/agent/conversation`, `/conversations/{id}/messages`, `/actions/{id}`) | **LIVE** |
| 9 Arena tools: search, nearbyActivities, listCommunities, searchJobs (read); createPost, createProject, joinActivity, placeBid, applyToJob (write) | **LIVE** |
| propose → approve → execute; 5-minute pending-action expiry; single-use approval | **LIVE** |
| `ContextualBrief`, `InterpretedIntent`, `StructuredDraft`, `ExplainedRecommendation` | **PROPOSED, NOT BUILT** |
| Expanded `ProposedAction` preview (payloadPreview, audience, dataShared, reversible) | **PROPOSED, NOT BUILT** |
| `AutomationRecipe`, `QueueItem`, `OutcomeEvent`, `AuditEntry` | **PROPOSED, NOT BUILT** |
| `schemaVersion` / `requestId` / `generatedAt` envelope; client-supplied `idempotencyKey` | **PROPOSED, NOT BUILT** |
| Per-field career visibility | **PROPOSED, NOT BUILT** (Arena BE) |

**Migration:**
- v2 is **additive and versioned** under `/api/agent/gateway/v2/*`, behind a flag, default off.
- v1 endpoints and bodies are unchanged and stay covered by the existing contract tests.
- A v2 field is relied on by the frontend only after JennySol marks it **BUILT** in
  `jennysol-ai/docs/JENNY-ARENA-CONTRACT.md` §6.
- Until then, the frontend's Jenny screens (mission §7 P8) run on **fixtures only**, per
  `docs/FE-API-GAPS.md`.

## 3. Automation safety
Recipes automate **monitoring, drafting, organizing and reminding** only. They **never** automatically:
- apply for a job;
- publish a post;
- send a message;
- invite users;
- change profile visibility;
- share candidate information;
- reveal exact location;
- schedule external meetings.

Every consequential action stays approval-bound. Every recipe can be paused, edited, revoked and inspected.

## 4. Gemini outage: what is blocked
Production Gemini returns **402 (prepaid credit depleted)** on key `…vteQ`. That's a FOUNDER action.

**Continues without credit:**
- the mobile shell;
- typed UI components;
- schemas;
- deterministic dev fixtures;
- contract tests;
- mocked-provider tests;
- Jenny-unavailable states;
- timeout and error handling;
- feature flags;
- backend authorization tests.

**Blocked until a paid key works:**
- live Gemini end-to-end validation;
- real contextual generation;
- the real Agency scorecard eval;
- provider latency and cost validation;
- enabling any new AI capability in production.

## 5. Branches and deployment
- **One owner per repo; feature branches only; never implement on `main`.**
- **Frontend:** Claude Code owns Arena FE. Branch `feature/arena-vnext-mobile-jenny`. Deployed
  only to the **existing protected preview** `preview-arena.vikisol.in`. Mission and build order:
  `docs/missions/FE-BPLUS-BUILD.md`.
- **P0 security release (separate, narrow):** Cursor finishes only this —
  branch `fix/p0-security-honesty` in Arena FE and BE; tests plus an architect review, then
  merge; follows its own release path, independent of the FE-BPLUS-BUILD mission.
- **Backend:** starts after the frontend is complete, scoped by `docs/FE-API-GAPS.md`.
- **Never:**
  - merge PR #1;
  - deploy VNext to production;
  - change DNS;
  - create a second hosting project.
- **Production promotion requires all of:**
  - green required checks;
  - architect review;
  - founder visual approval;
  - a verified commit stamp;
  - a mobile smoke test.
