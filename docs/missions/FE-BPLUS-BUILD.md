# FE B+ build mission (founder, 28 Sep 2026)

You are building the Arena mobile frontend to match the founder's final design boards (attached) exactly. The architect is Claude on claude.ai; you are the builder. FRONTEND ONLY in this mission. The backend comes later.

## 0. Setup (do first)
1. Work only in this repo (Vikisol-Arena-FE, arena-fe-vnext worktree). Never edit Vikisol-Arena-BE or jennysol-ai. You own the Arena frontend now; Cursor no longer touches it.
2. Branch:
   - If feature/arena-vnext-mobile-jenny exists (local or origin), switch to it and continue from its head.
   - Otherwise: git switch -c feature/arena-vnext-mobile-jenny f310ee6.
   - If there are uncommitted doc edits (AGENTS.md, CLAUDE.md, docs/…), commit them alone first: "docs: control plane".
   - Never commit to main, never force-push, never merge PR #1.
3. Record the mission:
   - Save this whole prompt as docs/missions/FE-BPLUS-BUILD.md and commit it.
   - Add a line at the top of docs/missions/CURSOR-M1.md: "Superseded by FE-BPLUS-BUILD.md (founder, 28 Sep 2026)".
   - Add at the top of docs/PROGRESS.md: "FE owner: Claude Code. Mission: docs/missions/FE-BPLUS-BUILD.md".
4. Write the screen spec from the boards (in docs/design/boards/ if present, and attached):
   - Study every screen and write docs/design/BPLUS-SCREENS.md. For each screen: route, layout top→bottom, every text string, components, states, data needed, motion.
   - Write docs/design/TOKENS.md with colours sampled from the images.
   - These two files are your source of truth in later sessions, when the images aren't in context.

## 1. Which boards are the design
- BUILD EXACTLY: every "ARENA B+" board and "CONCEPT B+ — Living Local Companion":
  - B+ core (Feed, Discover, Map, Work, Create, Profile, Jenny);
  - Entry & progressive onboarding;
  - Discover & join an activity;
  - From a local need to a real outcome;
  - Open the career layer;
  - Verified recruiter & hiring journey;
  - Messages, trust & everyday controls.
- BUILD THE FLOWS, RESTYLED INTO B+: "VNext — Jenny, the active AI layer" and "VNext — Jenny automates the outcome". Keep their screens and content, but use B+ colours, cream cards, type and the B+ bottom bar (no Map tab).
- DO NOT BUILD: "Concept A" and "Concept B" (superseded).

## 2. Architect's corrections (these override the images)
1. Bottom bar: Feed · Discover · (+) · Work · You.
   - Map is Discover's map mode (the B+ Map screen, with Discover highlighted).
   - Jenny is not a tab. She's reached from the Create sheet ("Ask Jenny"), Jenny cards in Feed, and the header.
2. Jenny is the orange orb (B+), never a human photo. Her status must be true: show "Offline" when the gateway isn't reachable.
3. No real brands:
   - replace Tata Digital, Swiggy, Zoho and any other real company or logo with fictional companies (GreenLeaf Labs, MapMyLane, CivicReach …) with monogram logos;
   - map place names (Gachibowli, Wipro Circle, ISB, Durgam Lake) are geography and stay.
4. No match percentages or scores.
   - Evidence counts are fine ("Matches 5/6 must-haves", "8 matches · 1 question · 1 missing").
   - Never sort or rank by them. The default sort is Most recent.
5. "You can undo this within 10 minutes" appears only when the action has reversible=true. Hidden by default.
6. Conversation screen: the "Audio session / Join audio room" card becomes a "Meeting link" card (same look, "Open link" button). No native audio.
7. The career board's person named "Jenny" becomes "Priya Sharma". No human shares Jenny's name.
8. Dates are computed and relative ("Today", "Sat, 12 Oct"). Never 2024.
9. Verified company, Verified neighbour and Online badges appear only when the data says so.
10. "Continue with Google" appears only if the existing auth supports Google. Otherwise hide it behind NEXT_PUBLIC_AUTH_GOOGLE and log it in the API gaps file.

## 3. Look (tokens)
Sample exact values from the images; start from these and correct them.
- Colours:
  - background: warm graphite #16110F; raised surface #211A17; line #3A2F2A;
  - paper (cream cards, sheets, forms): #F7F0E6 and #EFE6DA; ink on paper #1E1714; muted ink #6E625A;
  - text on dark: #F5EEE6; muted #A89C92;
  - orange primary #FF5A1F (pressed #E24A12); green #2F9E5B; blue #3B82F6; amber #F2A93B; red #E5484D;
  - category colours as in the Create sheet: Need orange-red, Offer green, Activity blue, Project green, Job orange, Jenny pink-orange gradient.
- Type:
  - display serif for titles and heroes: compare Fraunces, Playfair Display, Instrument Serif and DM Serif Display via next/font, pick the closest, and record the choice in TOKENS.md;
  - body: Inter;
  - scale: 32/36 display, 24 title, 17 card title, 15 body, 13 meta, 12 caption.
- Radius: cards 20, tiles 16, buttons 14, chips full. Spacing on a 4-pt grid; screen gutter 20.
- Icons: lucide-react, stroke 1.75.
- Logo: an SVG component of the orange "A" chevron mark + lowercase "arena" wordmark.
- Photos:
  - warm, golden-hour Hyderabad feel;
  - in preview-data mode use free-licence photos (Unsplash/Pexels) saved in public/fixtures/, with public/fixtures/CREDITS.md; never hotlink;
  - otherwise users' own uploads, with an initials avatar fallback.
- All tokens live in the Tailwind theme + CSS variables. No hex values in components.

## 4. Motion (premium, calm)
Use `motion` (Framer Motion) with LazyMotion + domAnimation, wrapped in <MotionConfig reducedMotion="user">.
- Bottom sheets: spring ≈260ms (stiffness 380, damping 34), drag to dismiss. Reduced motion: fade.
- Card lists: stagger 40ms (cap 8), 8px rise + fade.
- Press: scale 0.97, 120ms.
- (+) button: rotates 45° while the Create sheet rises and its items stagger in.
- Tab bar: the active indicator slides (layoutId) and the icon fills.
- Card → detail: shared hero image (layoutId) from Feed/Discover cards to Activity and Need details.
- Skeleton → content: 300ms dissolve, zero layout shift.
- Toggles, chips, dropdowns: 200ms.
- Onboarding: step dots fill; content slides 24px, direction-aware.
- Welcome hero: slow 12s Ken Burns. Reduced motion: static.
- Jenny orb: subtle breathing glow 1.6s; the same pulse while "thinking". Reduced motion: static.
- Join request sent: a paper plane flies in on a curve.
- "You're in!" / "It's done!": the check draws itself, plus a small confetti burst (≤24 particles). Reduced motion: check only.
- Timelines: 300ms crossfade + line fill.
- Profile stats count up once. Reduced motion: instant.
- Approve: navigator.vibrate(10) where supported.
- Performance: animate only transform and opacity; 60fps on a mid-range Android; nothing over 400ms except the ambient loops.

## 5. Tools
- 21st.dev Magic MCP: scaffold hard components (bottom sheet, segmented tabs, carousel, stepper, timeline), then restyle them to our tokens. Never keep their colours or fonts.
- UI UX Pro Max skill: run its hierarchy, spacing, contrast and touch-target checks at the end of each phase.
- shadcn/ui stays the base. Tailwind only; no page-specific CSS files.

## 6. Data (frontend-first, honest)
- src/lib/data/ holds one typed interface per domain: auth, profile, feed, activities, needs, offers, rooms/messages, notifications, search, jobs, applications, recruiter, jenny.
- The "api" implementation uses the existing calls in src/lib/api wherever the endpoint exists. Never change request or response shapes.
- The "fixtures" implementation covers everything else: fictional people and companies only.
- NEXT_PUBLIC_ARENA_DATA = api | mixed (mixed is the preview default). Any screen showing fixture data shows a small "Preview data" pill.
- Guard: the build FAILS if VERCEL_ENV=production and the mode isn't api.
- Each missing endpoint gets one row in docs/FE-API-GAPS.md (screen, what's needed, fields). That file becomes the backend plan.
- Auth: restyle Sign in / Sign up only. Keep the existing auth calls, session/cookie logic and redirects untouched.
- Don't remove or restyle the enterprise, company-admin or platform-admin shells in this mission.

## 7. Build order
Commit and deploy the preview after each phase. Don't stop between phases.
- P0 Foundation:
  - tokens, fonts, logo, motion primitives;
  - AppShell (header variants, bottom bar, (+) Create sheet, safe areas);
  - component kit: buttons, chips, segmented tabs, hero activity card, cream need/offer cards, person/activity/skill/project tiles, list row, status pill, avatar stack, stepper dots, form fields, toggle, bottom sheet, empty/error/offline/skeleton states;
  - the data layer;
  - a /dev/kit page showing every component (preview only).
- P1 Entry & onboarding (the first real screens): Welcome, Sign up, Sign in (+ Forgot password), Why are you here, Set up your local life, Your identity, You're all set.
- P2 Core: Feed, Discover, Discover map mode, Work, Create sheet, You (profile), Jenny home.
- P3 Discover & join: personalised feed, filters, map results, activity details, join request sent, approved & ready, activity room (Chat / Details / People).
- P4 Need → outcome:
  - Post a need, need page with offers, offer details, private coordination room (Plan / Chat / Files), mark as completed, the outcome on Work and on the profile;
  - Make an offer, Create an activity and Start a project forms in the same pattern.
- P5 Messages & trust: inbox, conversation, notifications, search, settings & privacy, report/block, resilient states (offline banner, empty, error + retry, draft saved).
- P6 Career: profile with "Open career profile", career intent, job preferences, visibility preview, Work → Jobs, job details, apply + application tracker.
- P7 Recruiter: choose role, company workspace, post a job (with the protected-attributes notice), manage job, candidates, candidate profile (evidence), interview & outcome, data retention note.
- P8 Jenny (B+ style). All data is fixtures in this mission.
  - the "Jenny noticed" card in Feed;
  - intent search in Discover ("Jenny understood your request" + "Why these results");
  - the Jenny draft in Create;
  - "Why this matches you" (no %);
  - Work sections: Needs your approval / Jenny can handle / Waiting on others;
  - the Approve action sheet (recipient, audience, data used; Approve / Always ask me / Cancel);
  - Jenny today plan + automations + permissions;
  - the job-search automation flow: tell Jenny → career draft → privacy & permission → set automation ("Never submit without my approval") → shortlist → review application → tracker.
- Routes: keep existing route names where they exist (check src/app). Record the full route map in BPLUS-SCREENS.md.

## 8. Fidelity loop (every screen)
1. Take a Playwright screenshot at 390×844.
2. Place it next to the board crop.
3. List every difference (spacing, size, colour, copy, icon, image crop) and fix it.
4. Repeat until the two read as the same screen.

Copy text exactly from the boards, except for the corrections in §2.

## 9. Quality gate (per phase)
- 320/360/375/390/430 px: no horizontal scroll, nothing hidden under the bottom bar, controls ≥44px, long text wraps.
- Desktop ≥1024px: the same mobile layout centred in a 480px column for now.
- Accessibility: WCAG AA contrast (check orange on cream), labelled icon buttons, visible focus, focus returns after sheets close.
- lint, typecheck and build green.
- Playwright mobile Chromium + WebKit smoke tests on the phase's routes.
- axe: no serious or critical violations. No console errors.
- Lighthouse mobile performance ≥85 on Feed.

## 10. End of each phase
1. Commit "FE B+ P<n>: <phase name>" and push.
2. Deploy the protected preview: preview-arena.vikisol.in → this branch. If the domain still follows feature/arena-vnext and the Vercel CLI can't change it, tell the founder the one setting to change.
3. Write docs/reviews/<SHA>.md: 390px screenshots next to the boards, plus what differs and why.
4. Update docs/PROGRESS.md.
5. Continue with the next phase.

## 11. Never
- production deploys, production env vars, DNS;
- merging PR #1;
- editing BE or JennySol, changing API contracts or auth logic;
- real brand names or logos;
- secrets in code or logs;
- fixture data outside preview mode;
- loosening a test to make it pass.

## 12. When you stop (done, blocked, or out of context)
Start your message with "FOUNDER: what I need from you" (at most 3 plain items), then the preview link and which phase to test.
On resume: read docs/PROGRESS.md and docs/missions/FE-BPLUS-BUILD.md and continue from there.
