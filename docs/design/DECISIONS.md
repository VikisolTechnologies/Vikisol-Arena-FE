# Design decisions log

One line per non-obvious call, newest first. Source order per the mission: (1) the B+ boards,
(2) FE-BPLUS-BUILD.md §2 corrections, (3) judgement — logged here when judgement was needed.

- **28 Sep (P1)** — Primary button keeps the board's white-on-orange; white on `#FF5A1F` is
  3.12:1, so the label is WCAG "large text" (19px bold, needs 3:1) instead of darkening the brand
  orange or switching to dark text. Orange *text on cream* uses `--primary-on-paper` `#B83A0A`
  (5.09:1); input borders use `--field-line` `#74655C` (≥3:1 vs page and field fill).
- **28 Sep (P1)** — Password rule is **6** characters (Arena BE `SignUpRequest @Size(min = 6)`),
  not the board's 8. The backend is the source of truth.
- **28 Sep (P1)** — Onboarding shows **4** step dots (the board shows 6): there are 4 real steps.
  No back button on step 1 (sign-up is already done); Skip on steps 1–3.
- **28 Sep (P1)** — Local life pre-selects **no area** (board shows Gachibowli selected): Arena
  doesn't guess where someone lives. "Use my current location" asks permission only when turned
  on and falls back honestly if refused.
- **28 Sep (P1)** — "Explore first" is exclusive and goes straight to the Feed. "You're all set"
  appears only after the real save succeeds, never by URL.
- **28 Sep (P1)** — Answers Arena BE can't store yet (photo, title, intro, interests,
  availability, intents, a changed display name) stay in the local draft, the identity card says
  so, and each is a row in `docs/FE-API-GAPS.md`. Area/current location are saved for real.
- **28 Sep (P1)** — Sign up has no public role picker (P0 audit). Company accounts keep working
  via a quiet "Hiring for a company? Create a company account" link until P7's role chooser.
- **28 Sep (P1)** — Welcome hero is a real Durgam Cheruvu sunset (Wikimedia Commons, CC BY-SA
  4.0, credited on screen and in `public/brand/CREDITS.md`) instead of the board's stock runners:
  a real landmark in the launch zone, and no invented people.
- **28 Sep (P1)** — `/` now renders Welcome (signed-in visitors are redirected server-side with
  the same session check the middleware uses for `/auth`). The old "Talent OS" landing
  components it replaces were deleted.
- **28 Sep (P1)** — Wordmark is a heavy tight sans with a stroked chevron mark (matches the
  boards), not the display serif; the serif is for headings only.
- **28 Sep (P1)** — Motion features load via `domMax` (async, so no first-load cost) rather than
  `domAnimation`: drag-to-dismiss sheets and `layoutId` transitions both need it.
- **28 Sep (P1)** — B+ screens reserve the cookie banner's height at the bottom while it's up (it
  was covering the primary Continue button for first-time visitors).
- **28 Sep 2026** — Display serif picked as **Fraunces** (not Playfair/Instrument Serif/DM Serif
  Display) — closest match to the boards' warm, high-contrast, ball-terminal serif; see
  `docs/design/TOKENS.md` for the full reasoning. Revisit once real screens exist to compare
  directly against the board crops.
- **28 Sep 2026** — M1A (auth + onboarding, `d746cf9`/`1e8bf98`) is kept and will be restyled/
  rebuilt in P1 rather than deleted outright before P1 starts — its functional logic (real auth
  calls, session handling) is reusable even though its visual design is superseded; the "delete
  old code in the same commit" rule applies once P1 actually replaces each screen, not before.
- **28 Sep 2026** — Map has no dedicated route/bottom-bar entry; it's a view mode of `/discover`
  (exact param/URL shape deferred to P2/P3 when that screen is actually built).
- **28 Sep 2026** — Conversation screen's "Audio" icon in the composer is read as a voice-message
  attachment (not a live call) and is in scope; the *Audio session / Join audio room card* is what
  correction #6 replaces with a Meeting-link card. Flagged as an assumption to verify against the
  live API in P5 — if wrong, drop the mic icon and log the gap in `docs/FE-API-GAPS.md`.
- **28 Sep 2026** — Kept a single shared `Card`/`CardContent` pair rather than a second
  implementation, per this repo's own existing anti-duplication note in `card.tsx`.
