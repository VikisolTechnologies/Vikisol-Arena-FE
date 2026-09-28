# Design decisions log

One line per non-obvious call, newest first. Source order per the mission: (1) the B+ boards,
(2) FE-BPLUS-BUILD.md §2 corrections, (3) judgement — logged here when judgement was needed.

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
