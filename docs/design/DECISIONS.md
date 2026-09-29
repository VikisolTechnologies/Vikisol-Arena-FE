# Design decisions log

One line per non-obvious call, newest first. Source order per the mission: (1) the B+ boards,
(2) FE-BPLUS-BUILD.md §2 corrections, (3) judgement — logged here when judgement was needed.

- **29 Sep (F2)** — Map: a static dark basemap of the launch zone (12 × 16 km), rendered once from
  OpenStreetMap tiles and restyled to the board's graphite/teal (`public/fixtures/map/`, 133 KB,
  "© OpenStreetMap contributors" on the map). Pins are placed by Web Mercator from each item's
  approximate point; outside the basemap the drawn map is used. No runtime tile requests. The
  nearest activity is previewed under the map until a pin is tapped (board).
- **29 Sep (F2)** — Discover → Activities uses the board's filters: Today / Weekend / Free, then
  Fitness / Learning / All filters (sheet with every category). "Free" narrows nothing — every
  Arena activity is free (paid work is a project) — and the sheet says so. Discover lists only
  items within the Nearby radius, like the Feed.
- **29 Sep (F2)** — Search matches the board: scopes People / Activities / Needs / Jobs / Skills,
  "Near <area>" (shared with Feed/Discover), a distance filter (2/5/10 km/any; items without a
  point stay, marked "distance unknown"), a Safe & private explainer, photo results with save.
  Before typing it shows the newest things nearby as results. People/Skills use preview
  neighbours in preview mode only (gap #17 in real mode).
- **29 Sep (architect review A)** — One preview world: `src/lib/fixtures/world.ts` holds the 13
  neighbours (roles, skills, interests, bios), the jobs near them, Priya's applications, chats and
  notifications, and the business demo (GreenLeaf Labs hiring a Community Program Assistant, with
  applicants whose work fits). Every mock file derives from it; the random 27 extra candidates and
  random name generator are gone, and avatar photos match full names only (two people never share
  a face). A new posting's seeded applicants must share skills or field with the job.
- **29 Sep (architect review A)** — Preview labelling is quiet: mock mode shows one slim bar at the
  top of each screen ("Preview data — sample neighbours and activities"); per-card and per-section
  labels only appear in real "mixed" mode, as a small muted "Sample" mark where fixtures sit among
  real content.
- **29 Sep (architect review A)** — Light "paper" pages via a `data-tone="light"` token scope (cream
  page, near-white cards, ink text; the bottom bar keeps `data-tone="dark"`). Used by every business
  page, Choose role, and the career intent/setup/privacy, job details and my-application screens.
  Business on phones gets a bottom bar (Home · Jobs · (+) Post · Candidates · Company); the rest of
  the business nav and Sign out sit in a ☰ menu. Desktop left nav unchanged. New standalone
  `/enterprise/candidates` (one job at a time: evidence is checked against that job's must-haves).
- **29 Sep (architect review A)** — Icon badges are solid white glyphs in 44 px saturated circles
  (`IconBadge` + `SolidIcons`, hand-drawn 24 px glyphs) on onboarding tiles, next steps, the Create
  sheet, Choose role and Settings rows. Lucide outline icons stay for inline/UI icons.
- **29 Sep (architect review A)** — Business tabs read "… · Arena for Business"; "Talent Universe"
  and "Enterprise Admin" are gone from user-visible text. The plan tier named "Enterprise" (Free /
  Pro / Enterprise) keeps its name — it's a pricing tier, not the product. The stale
  `/enterprise/interviews → /enterprise/postings` redirect was removed (the page exists since P7).
- **29 Sep (architect review A)** — New passwords need 8 characters (FE), stricter than the API's 6
  (gap #36); sign-in still accepts older passwords. Need cards show "N offers" with the offerers'
  faces when the feed provides an offer count (mock today, gap #38), else the honest reply count.
- **29 Sep (architect review A)** — Speed: mock API delays are capped at 60 ms (they chained into
  multi-second skeletons). Production build, Pixel 7 profile with 4× CPU slowdown on Wi-Fi-speed
  network: Feed 1.1 s, Discover 0.8 s, Work 0.5 s, You 0.5 s, Inbox ≤1.0 s, Activity 0.7 s, Jobs
  ≤1.0 s to content. Local preview photos go through `next/image` with sizes from the box
  (thumbnails download ~96 px); all fixture photos are WebP ≤ 150 KB. Dev-server skeletons are
  compile time, not the app.
- **29 Sep (fidelity pass)** — Preview (mock) mode shows credited free-licence photos for the
  fictional neighbours and preview posts (`public/fixtures`, `CREDITS.md`); real mode never does.
  All mock content is labelled "Preview data". "Nearby" = within the radius (default 5 km of the
  launch zone) — never "has a location". Autopilot and Auto-apply are no longer offered: Jenny
  prepares, you approve. Screens that don't truly match their board went back to In progress
  with a note (docs/reviews/fidelity-pass.md).
- **29 Sep (fidelity pass)** — Procedural covers redrawn photographic (sky gradient, light source,
  blurred horizons, grain) with a small corner glyph; the Arena mark redrawn as the board's bold
  rounded "A"; cookie banner is a compact one-row bar.
- **29 Sep (P9)** — Company settings rebuilt on the B+ frame. **Billing is display-only** (flow
  §8): the in-page "Switch to …" button was removed because it changed plans with no payment
  step; `changePlan` stays in the API layer unused (gap #35). Audit actions show in plain words
  (codes stay the filter values). Team: invite validates after blur and shakes once; removing
  someone asks first. Emoji company logos are replaced by the generated `CompanyMark` monogram.
- **29 Sep (P7/P9)** — Talent no longer shows a match % or the random "fit" blurbs (the mock
  picked them at random; there's no real basis), and a person's internal Career health score is
  hidden from companies. Cards show only what people shared. Messaging from a talent profile now
  opens the business inbox (`/enterprise/messages?with=`), not the personal one. The old
  Starfield search backdrop was deleted. Company posts: sheet composer, validate after blur,
  one shake on a failed publish, delete asks first.
- **29 Sep (P7/P9)** — Interview feedback is **per must-have** (Clearly shown / Partly / Not seen)
  + next step; the old 1–5 slider is gone. The API's required `rating` is derived and never shown
  (gap #33). The simulated "join camera" step was removed: the room shows the real meeting link
  (copy / Join call) and an .ics "Add to calendar". `/enterprise/interviews` (new index, nav
  already pointed there) groups people by what they need: upcoming, waiting for a time, decide.
- **29 Sep (P7/P9)** — Arena for Business uses one B+ frame (`DashShell`): dark desktop sidebar
  with a cream active pill (shared-layout slide), phones get a compact top bar + scrolling pill
  nav instead of the consumer tab bar. Each app keeps its own role gate and sign-out.
- **29 Sep (P7/P9)** — Pipeline: drag between columns only on a fine pointer ≥1024px (lift 1.02 +
  shadow, spring drop via shared layout); every card also has a "Move to" menu, so dragging is
  never required (WCAG 2.5.7). Phones default to the List view (board 5).
- **29 Sep (P7/P9)** — Moving anyone to **Not selected** (drag, menu, bulk or profile) always opens
  the kind-message sheet first; it says plainly that Arena's standard notice is sent until
  personal messages exist (gap #31). "Hired" isn't a column (gap #21) — Offer is the last step.
- **29 Sep (P7/P9)** — **Must-have evidence** is computed only from what the applicant shared
  (skills, title, bio): shown / partly shown / not shown, and the copy says "not shown ≠ can't".
  Filters are evidence-only (skills, experience, location, remote); the filter sheet states Arena
  never filters on age, gender, religion, caste or marital status.
- **29 Sep (P7/P9)** — Small green/blue/red text on dark surfaces failed AA (3.7–4.2); added
  `--success-on-dark #4cc27c`, `--info-on-dark #7aa7ff`, `--danger-on-dark #ff7a7e` (≥5.3 on tints).
- **29 Sep (P7/P9)** — Candidate profile is its own route
  (`/enterprise/postings/[id]/candidates/[applicationId]`) so it deep-links from Home and back.
  Founder preview: `/dev/business?to=…` seeds a mock-mode demo recruiter (mock mode only).
- **29 Sep (P6c)** — Post a Need is now **category → intake**: 12 categories (§4) each with its own
  questions, plus urgency and help type for every need; rides show a safety note and keep the
  pickup point private (after approval). The single-form PostNeedScreen was deleted.
- **29 Sep (P6c)** — "How far to show it (radius)" isn't asked: the API has no radius (gap #27);
  "Share with" (nearby / followers) stays, because it's real.
- **29 Sep (P6c)** — Offers (O1–O3) use the same engine and the need page mirrored: on an offer,
  neighbours "Ask for this" (a join request), the owner accepts → the same private room → mark done.
- **29 Sep (P6c)** — Projects: §7 describes collaborative projects (roles, applicants, team room,
  milestones) that the API doesn't model. **Paid** projects publish through the existing projects
  marketplace; **collaborative** ones save as a device draft, the button says "Save draft", and
  PR3–PR6 are shown as blocked (gap #26) — nothing pretends to publish.
- **29 Sep (P6c)** — The Create sheet's short in-sheet composer is gone: every row opens its full flow.
- **29 Sep (P6b)** — **Procedural covers** (`ProceduralCover`): seeded by the activity id → unique
  and free; category palette, time-of-day glow (launch-area time, so server and client agree),
  one of 5 patterns, bokeh, grain, a large category glyph (custom sport glyphs where lucide had
  none). Used wherever an activity/project has no photo; needs keep a plain warm card (§5).
- **29 Sep (P6b)** — The chosen cover is **rendered to WebP and stored through the existing media
  upload** at publish, so what the host picked is exactly what everyone sees (no `coverUrl`/seed
  field needed). If rendering fails, the card regenerates from the post id.
- **29 Sep (P6b)** — With `NEXT_PUBLIC_JENNY_COVERS` off (default) the screen is titled "Your cover"
  and labels the card "Cover card · made for this activity" — never "AI-generated". The AI path
  (shimmer + orb, "Cover by Jenny · AI-generated", honest fallback line) calls the PROPOSED
  contract only when the flag is on (gap #24).
- **29 Sep (P6b)** — Activity answers that are **public** (level, cost, type questions, bring,
  accessibility, indoor/outdoor) go into the post text so joiners see them today; the exact point
  and online link go only into `exactMeetingPoint` (after approval). Host questions, waitlist,
  repeat, min size and link-only visibility wait for the API (gap #23); "Who sees it" isn't asked
  because the API can't honour link-only yet. Women-only is a label + forced approval; no gender field.
- **29 Sep (P6b)** — "Or just tell Jenny" on A1 arrives with Jenny pre-fill in P8 (§10), not before.
- **29 Sep (P6b)** — Manage uses what's real: starting-soon card, check-in (`recordJoinOutcome`,
  from 1 h before to 72 h after), cancel with a required reason posted to the room, joiner leave
  before start (`withdrawJoin`). Edit, waitlist, answers, attendance confirm and feedback are
  listed on /dev/progress as blocked with their gap numbers.
- **29 Sep (P6)** — Built the **intake engine** (`src/lib/intake/`, `IntakeForm`) first and expressed
  Career §6 as a schema, rather than hand-building Career and rebuilding it in P6b. ≤4 questions
  per step (dev warning), "why" lines, visibility locks, "Add more details", Jenny-filled glow,
  autosaved drafts, review with edit-from-review.
- **29 Sep (P6)** — Career publish sends only what Arena BE stores (title, experience years, skills,
  preferred locations, openTo from intent, resume, consent). Answers marked **Only me / Only employers
  I apply to** (current company, CTC, status, notice, proficiency, links, education) **stay on the
  device** until per-field visibility exists (gap #19) — sending them to a profile field whose
  audience we can't control would break "nothing is shared until the person chooses".
- **29 Sep (P6)** — No match percentages anywhere (flow §6): job cards and details show evidence
  ("skills 3/5", ✓/◌ per skill). The old job page's % badge and the application page's invented
  "agent's rationale" + generated résumé (`TailoredResume`) were removed.
- **29 Sep (P6)** — Apply sheet shows exactly what's shared and needs a consent tick; screening
  answers, cover note and "include my CTC" aren't collected because the apply API takes `jobId`
  only (gap #20) — nothing is asked that can't be sent.
- **29 Sep (P6)** — Tracker stages come from the real `ApplicationStage` (applied → screening →
  interview → offer, plus "Not selected"); no "Hired" step or offer accept/decline (gap #21).
- **29 Sep (P6)** — Hire locally explains Arena for Business and offers sign-out → sign-up (a
  personal account can't open `/enterprise/*`); P7/P9 add the proper role chooser.
- **29 Sep (P6)** — Jobs lives at `/jobs` (reached from a "Jobs" pill on Work); company marks are
  colour monograms (correction #3). No save/bookmark, People or Reviews tabs (gap #22).
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
