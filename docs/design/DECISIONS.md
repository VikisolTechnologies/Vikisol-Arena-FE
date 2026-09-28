# Design decisions log

One line per non-obvious call, newest first. Source order per the mission: (1) the B+ boards,
(2) FE-BPLUS-BUILD.md §2 corrections, (3) judgement — logged here when judgement was needed.

- **28 Sep (P5)** — Inbox merges rooms and direct chats (unchanged behaviour, `?with=` kept);
  filters All / Activities / Needs / Jobs / Direct come from the room's post type and the chat's
  job context. Times are relative (correction #8). Old `inbox-v3` components deleted.
- **28 Sep (P5)** — Conversation action bar is **Block / Close chat (anonymous) / Report**: no
  Audio, Attach or Mute (no endpoints; correction #6 — a meeting link in the chat renders as a card
  with "Open link"). Composer is text only (gap #9 covers attachments).
- **28 Sep (P5)** — One **ReportSheet** for rooms, chats and posts (real report endpoints; reason
  required, optional detail, optional "Also block"). Evidence upload left out (gap #15). The SLA
  line "usually within 24 hours" is **not** shown — nothing guarantees it; it says "Our safety team
  reviews every report". Room/need/activity reports now ask for a reason instead of one-tap reporting.
- **28 Sep (P5)** — Notification filters are **All / Unread / Jobs / Messages / Jenny**, derived from
  each notification's real type and link; Activities/Needs can't be told apart from the data (gap
  #16). Snooze / Not interested left out (no endpoints).
- **28 Sep (P5)** — Search scopes are **All / Activities / Needs / Jobs / Projects** (the API has no
  people or skills search, and no radius — gap #17); results are "Most recent first" only
  (correction #4), no relevance sort, no bookmark.
- **28 Sep (P5)** — Settings is the board's list; each row opens a sheet with the **same calls as
  before** (location consent, career visibility, Jenny autonomy/auto-apply with the Pro lock,
  DOB/phone OTP, email/password change, export, delete, blocked accounts). "Profile visibility" and
  "Notification preferences" rows are left out (no endpoints, gap #18). The "Demo mode: code is
  123456" hint now shows only in mock mode.
- **28 Sep (P5)** — Settings → "Reduce motion effects" now also switches B+ motion off
  (MotionConfig `always`), not only the old effects.
- **28 Sep (P5)** — Compact pills (32px, 44px hit area) so five filters fit one row at 360px.
- **28 Sep (P5)** — Resilient states use one `StateCard` (offline / empty / error / saved). No
  "Recent (cached)" list: nothing is cached for offline viewing, so it isn't claimed.
- **28 Sep (P5)** — Mock data (mock API mode only) named real consumer brands (Swiggy, Microsoft,
  Paytm, Zoho, Freshworks, Practo, Delhivery, Razorpay) — replaced with fictional names (§11). All mock
  company names are now fictional (Techolution → Lakeshore Tech, Innova → Meridian Works, 29 Sep).
- **28 Sep (P4)** — A need is a post with `intentType: "ask"`; an **offer of help is a real join
  request** and "Accept & open chat" is `decideJoin(approve)`, which opens the room. Needs are posted
  with `visibility: "approval"` so the owner chooses who helps.
- **28 Sep (P4)** — Post a Need adds **More details (optional)** (board has none, but the need page
  shows a description); only "what" and category are required. Preferred time is a real window on
  the post (Today / This weekend / Next week / Flexible). The draft stays on this device (offline).
- **28 Sep (P4)** — Share with: "Nearby people ({area})" = global audience, "People who follow me" =
  followers; each says who can see it. A "local only" audience isn't selectable in the API yet.
- **28 Sep (P4)** — Offer rows show "Offered to help · 2 h ago" (join requests carry no message,
  gap #12); Offer details shows the offerer's real public profile (title, area, bio, skills) with
  **Skills** instead of "Shared interests" and no "Recent outcomes" (gap #13).
- **28 Sep (P4)** — Need page owner actions: **Share / Open chat** and **Close** (`cancelPost`); Edit
  and Pause are left out (no endpoints, gap #14).
- **28 Sep (P4)** — Coordination room: **Plan / Chat** (Files left out, gap #9); "Add meeting link"
  (correction #6) posts `Meeting link: https://…` into the room and the pinned card shows the newest
  one — https only, opened with `noopener`. Pinned details are read-only ("Update" needs gap #14).
- **28 Sep (P4)** — Mark as completed is the owner's real `closeNeed`. Two-sided confirmation doesn't
  exist (gap #11), so the sheet says "Confirmed on your side" and that the other person *sees it as
  completed* — never a fake "Waiting for Rohit". The optional note is sent into the chat; the
  outcome photo is left out (gap #9).
- **28 Sep (P4)** — Work gets **Everything / My needs / My offers** (board shows the two; "Everything"
  keeps activities and applications reachable) and a Completed pill on finished rows.
- **28 Sep (P4)** — Orange-on-tint status pills use a 10% tint (15% was 4.3:1; 10% is 4.54:1).
- **28 Sep (P4)** — `BottomSheet` renders nothing until hydrated: a sheet open on first render
  used to cause a hydration mismatch.
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
