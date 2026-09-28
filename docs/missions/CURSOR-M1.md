**Superseded by FE-BPLUS-BUILD.md (founder, 28 Sep 2026).**

# Cursor Mission M1 — Mobile shell, tokens, navigation, rich Feed card

**Issued by** the architect, 27 Sep 2026 (reissued 01:00 IST).
**Do this only after** the P0 work (audit P0-1/P0-2) is committed on its own branch `fix/p0-security-honesty` and handed to the architect for review.

1. **Branch:** `git switch -c feature/arena-vnext-mobile-jenny f310ee6`. That's `origin/feature/arena-vnext` at **`f310ee6`**. Don't guess another base. PR #1 stays open and **unmerged**.
2. **You may change:**
   - `src/components/vnext/**` and `src/components/ui/**` (shared tokens and primitives);
   - talent route layouts and pages: `src/app/home`, `src/app/discover`, `src/app/work`, `src/app/identity`, `src/app/feed/[id]`;
   - feed types in `src/lib/api/feed*`.

   In **Arena BE**, you may change only one thing: if `GET /feed` items lack it, add **`demoContent`** (boolean) to `FeedItemResponse` and map it in `FeedAggregationService`. Additive, with a test.
3. **You must not change:**
   - Jenny request/response JSON, agent endpoints or tool contracts;
   - auth/session code;
   - the enterprise, company-admin and platform-admin shells;
   - anything in `jennysol-ai`;
   - DNS, production env vars, production deploys;
   - PR #1's merge state.

   **Never introduce `isDemo`.** The name is `demoContent` everywhere.
4. **Reference:** Concept board A (founder's Mac: `~/.codex/generated_images/01a0d9c7-…/exec-f4234256….png`), frames 1 Feed and 6 Profile. Build it as components; **don't embed the image.** Decisions are in `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md` §1.
5. **Build:**
   - **Shell:**
     - graphite surfaces, editorial display headings, orange primary actions;
     - bottom bar **Feed · Discover · (+) · Work · You** with icons and labels;
     - header with the location chip (default "Gachibowli"), notifications, and Inbox with an unread badge when signed in, or **Sign in** for guests;
     - safe-area insets;
     - **one shell for all talent routes**, including `/feed/[id]`.
   - **Tokens:** colour, radius, spacing, type scale, motion durations. No page-specific CSS.
   - **Feed:**
     - greeting hero (with a guest variant); chips Nearby / Activities / Needs / Projects;
     - the **rich card**: avatar, kind chip, title, area, when, going/spots-left, media thumbnail, one primary action;
     - the DEMO badge when `demoContent`;
     - layouts vary by kind.
   - **`JennyBrief`:** renders **nothing** in M1.
   - **Per-route `<title>`** everywhere.
   - **Lint:** all errors fixed.
6. **Acceptance:**
   - at **320, 360, 375, 390 and 430 px**: no horizontal scroll; nothing under the tab bar or browser chrome; controls **at least 44px**;
   - long text wraps;
   - no layout shift from skeleton to content.
7. **Accessibility and motion:**
   - labelled icon buttons, visible focus, focus returns after sheets close;
   - card stagger 40ms (capped), press 0.97, dissolve about 300ms;
   - `prefers-reduced-motion`: fades or instant.
8. **Checks:**
   - `npm run lint` and `npm run build` green;
   - Playwright mobile **Chromium + WebKit** on the talent routes;
   - axe with no serious/critical violations;
   - **screenshots at 320 and 390** of Feed, Feed detail and You.
9. **Commit message:** `M1: mobile shell, tokens and rich feed card`.
10. **Finish:**
    - write `docs/reviews/<SHA>.md` with the evidence and update `docs/PROGRESS.md`;
    - push the branch and point the **existing protected preview** (`preview-arena.vikisol.in`) at it;
    - **stop.** No production deploy. The architect reviews, then the founder does.
