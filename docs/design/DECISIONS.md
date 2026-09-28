# Design decisions log

One line per non-obvious call, newest first. Source order per the mission: (1) the B+ boards,
(2) FE-BPLUS-BUILD.md §2 corrections, (3) judgement — logged here when judgement was needed.

- **28 Sep (P3)** — Motion features (`domMax`) now load **synchronously**, reversing the P1 async
  choice: an `AnimatePresence mode="wait"` exit that began before the async chunk arrived never
  finished, so the Feed could stay blank instead of showing its error (caught by the local suite on
  Pixel 7, 2 of 4 runs; 6/6 after). Correctness over a small first-load saving.
- **28 Sep (P3)** — Restored Jenny's **real proposal cards** (`JennyActionCard`), which P2 dropped:
  Approve/Not now call `POST /agent/actions/{id}` with only the proposal id; a click is always
  required; an unconfirmed result never invites a blind retry. When a real proposal exists the
  preview "For you" card is hidden, so the two can't be confused.
- **28 Sep (P3)** — Activity details lives at the existing `/feed/[id]` (activities only); needs,
  offers and updates keep the previous detail view (`components/legacy/PostDetailLegacy`) until P4.
- **28 Sep (P3)** — Before approval only the area and distance show, with "exact point shared after
  you join"; `exactMeetingPoint` appears only on the approved view (the backend already withholds it).
- **28 Sep (P3)** — Add to calendar downloads a real **.ics** file (every calendar app, no
  permission, no backend). **Set reminder** is left out — no reminder endpoint (gap #7).
- **28 Sep (P3)** — "Free" chip left out of Discover — activities carry no price (gap #8). "All
  filters" left out: the chips already cover every filter the API supports.
- **28 Sep (P3)** — Board's host line "Verified neighbor · Runner · Designer" shows the real
  "Joined N activities on Arena" instead; verification badge waits for real verification data.
- **28 Sep (P3)** — No hero photo when the activity has no media: warm gradient (as P2), never a
  stand-in. The board's shared-element card→hero transition needs a same-page layout; across routes
  the hero rises in with the `rise` variant instead.
- **28 Sep (P3)** — Request to join is pinned above the tab bar (board) with a paper fade behind it.
- **28 Sep (P3)** — Room: tabs are one segmented track (`Pills segmented`); Host tools stays in the
  activity page's host panel (approve/decline/cancel) rather than a third room button; image
  attachment in the composer is left out (no room upload endpoint).
- **28 Sep (P3)** — The join requirement dialog (verification needed) keeps its previous style; it
  is rarely seen and is restyled with P5's trust screens.
- **28 Sep (P3)** — `/dev/screen/<id>` renders the real P3 components with fixed fictional data so
  compare pages show them without a real record; notFound in production and in api mode.
- **28 Sep (P2)** — People tiles and Skills use **initials, not stock faces**, and are preview
  fixtures (Preview data pill) until a people-nearby/skills endpoint exists; hidden in api mode.
- **28 Sep (P2)** — Cards without media show a warm gradient, never a stand-in photo.
- **28 Sep (P2)** — Feed opens on **Nearby** (board); if nothing is location-tagged it shows
  everything with a one-line note, rather than an empty first screen.
- **28 Sep (P2)** — Feed header adds an **Inbox** icon beside the bell (board shows the bell only;
  the Inbox must stay reachable and has no tab).
- **28 Sep (P2)** — Discover's top-right icon toggles **map mode** (board shows search there; the
  search field is already right below). `/map` deep-links into map mode. Without a Google Maps
  key the map is a light drawn map with real approximate pins — no 3D, no fake geography labels;
  it says "launch area" until the person's approximate area is known.
- **28 Sep (P2)** — Active orange pills use **ink text** (white on #FF5A1F at 14px is 3.11:1);
  buttons keep white 19px bold (large text).
- **28 Sep (P2)** — Profile: **no Online badge** (no presence data, correction #9); interests,
  photo and availability come from this device's draft and say so; cover image is the brand
  Durgam Cheruvu photo, not the person's.
- **28 Sep (P2)** — Jenny home: status pill appears **only after a real reply** (Online/Offline);
  the "For you" card is labelled preview data and its Approve/Not now do nothing and say so. A
  back button replaces the board's kebab because Jenny has no tab to return to.
- **28 Sep (P2)** — Create sheet's rows open a short real composer for Need/Offer/Activity/Project
  (existing endpoints) until P4's full forms; Post a Job goes to the company postings flow (or
  explains for personal accounts); Ask Jenny opens Jenny.
- **28 Sep (P2)** — Auth forms use `method="post"`: a submit before hydration must never put an
  email or password into the URL.
- **28 Sep (P2)** — `/dev/progress` board frames are WebP (PNG crops were 83MB).
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
